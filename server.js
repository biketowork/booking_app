require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// BAZA PODATAKA (SQLite)
const dbPath = path.join(__dirname, 'skoda_rezervacije.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Greška pri povezivanju na bazu:', err.message);
    else console.log('Povezan na SQLite bazu.');
});

db.serialize(() => {
    // Tabela za rezervacije (dodat user_id da se tačno zna vlasnik)
    db.run(`
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            person_name TEXT NOT NULL,
            start_datetime TEXT NOT NULL,
            end_datetime TEXT NOT NULL,
            note TEXT
        )
    `);

    // Tabela za korisnike sa ulogom (role)
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user'
        )
    `, () => {
        // Automatski postavi admin nalog na 'admin' ulogu ako već postoji
        db.run(`UPDATE users SET role = 'admin' WHERE email = 'admin@bebakids.com'`);
    });
});

// NODEMAILER TRANSPORTER ZA SLANJE MEJLOVA
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.bebakids.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// OSNOVNI MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'skoda-rental-lime-theme-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 8 
    }
}));

function requireAuth(req, res, next) {
    if (req.session && req.session.user) return next();
    return res.status(401).json({ error: 'Niste prijavljeni na sistem.' });
}

// 1. REGISTRACIJA RUTA SA SLANJEM MEJLA
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, confirmPassword } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Korisničko ime i lozinka su obavezni.' });
        }

        if (confirmPassword && password !== confirmPassword) {
            return res.status(400).json({ error: 'Lozinke se ne podudaraju.' });
        }

        const cleanInput = username.trim().toLowerCase();
        const cleanUsername = cleanInput.replace('@bebakids.com', '');
        const email = `${cleanUsername}@bebakids.com`;

        const hashedPassword = await bcrypt.hash(password, 10);

        // Ako je korisnik admin, automatski mu dodeli 'admin' ulogu
        const role = cleanUsername === 'admin' ? 'admin' : 'user';

        const sql = `INSERT INTO users (email, password, role) VALUES (?, ?, ?)`;
        db.run(sql, [email, hashedPassword, role], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Korisničko ime je već zauzeto.' });
                }
                return res.status(500).json({ error: 'Greška pri registraciji u bazi.' });
            }

            // Slanje obaveštenja o uspešnoj registraciji na email
            const mailOptions = {
                from: '"Sistem za rezervacije" <obavestenja@bebakids.com>',
                to: email,
                subject: 'Uspešna registracija na sistem',
                text: `Zdravo ${cleanUsername}!\n\nUspešno ste se registrovali na sistem za rezervacije Škoda vozila.\nVaše korisničko ime / email je: ${email}\n\nMožete se prijaviti na sistem i zakazati željeni termin.`
            };

            transporter.sendMail(mailOptions, (mailErr, info) => {
                if (mailErr) {
                    console.error("Greška pri slanju verifikacionog mejla:", mailErr);
                } else {
                    console.log("Mejl uspešno poslat: " + info.response);
                }
            });

            return res.status(201).json({ success: true, message: 'Uspešno registrovani!' });
        });
    } catch (err) {
        console.error("Greška tokom registracije:", err);
        return res.status(500).json({ error: 'Serverska greška.' });
    }
});

// 2. LOGIN RUTA
app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Korisničko ime i lozinka su obavezni.' });
        }

        let email;
        const cleanInput = username.trim().toLowerCase();

        if (!cleanInput.includes('@')) {
            email = `${cleanInput}@bebakids.com`;
        } else {
            const cleanUsername = cleanInput.replace('@bebakids.com', '');
            email = `${cleanUsername}@bebakids.com`;
        }

        const sql = `SELECT * FROM users WHERE email = ?`;
        db.get(sql, [email], async (err, user) => {
            if (err) return res.status(500).json({ error: 'Greška na serveru.' });
            if (!user) return res.status(401).json({ error: 'Pogrešno korisničko ime ili lozinka.' });

            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(401).json({ error: 'Pogrešno korisničko ime ili lozinka.' });

            // Sačuvaj i rolu u sesiji
            req.session.user = { 
                id: user.id, 
                email: user.email, 
                name: email.split('@')[0],
                role: user.role || 'user'
            };
            
            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error("Greška pri čuvanju sesije:", saveErr);
                    return res.status(500).json({ error: 'Serverska greška pri prijavljivanju.' });
                }
                return res.json({ success: true, redirect: '/rezervacija', user: req.session.user });
            });
        });
    } catch (err) {
        console.error("Greška na serveru tokom logina:", err);
        return res.status(500).json({ error: 'Serverska greška.' });
    }
});

// 3. SESIJA ENDPOINTI
app.get('/api/session', (req, res) => {
    if (req.session && req.session.user) {
        return res.json(req.session.user);
    }
    return res.status(401).json({ error: 'Niste prijavljeni.' });
});

app.get('/api/me', requireAuth, (req, res) => {
    return res.json({ user: req.session.user });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        return res.json({ success: true });
    });
});

// 4. STRANICE I SERVIRANJE STATIČKIH FAJLOVA
app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/rezervacija', (req, res) => {
    if (req.session && req.session.user) {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    return res.redirect('/');
});

app.use(express.static(path.join(__dirname, 'public')));

// 5. API REZERVACIJE
app.get('/api/reservations', requireAuth, (req, res) => {
    db.all(`SELECT * FROM reservations ORDER BY datetime(start_datetime) ASC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Greška pri čitanju baze.' });
        return res.json(rows);
    });
});

app.post('/api/reservations', requireAuth, (req, res) => {
    const { start_datetime, end_datetime, note } = req.body;
    const currentUserId = req.session.user.id;
    const currentUserEmail = req.session.user.email;

    if (!start_datetime || !end_datetime) {
        return res.status(400).json({ error: 'Početno i krajnje vreme su obavezni.' });
    }

    const now = new Date();
    const newStart = new Date(start_datetime);
    const newEnd = new Date(end_datetime);

    if (newStart < now) {
        return res.status(400).json({ error: 'Ne možete rezervisati termin u prošlosti.' });
    }

    if (newEnd <= newStart) {
        return res.status(400).json({ error: 'Kraj rezervacije mora biti nakon početka.' });
    }

    const diffInMs = newEnd - newStart;
    if (diffInMs < 3600000) {
        return res.status(400).json({ error: 'Rezervacija mora trajati najmanje 1 sat (60 minuta).' });
    }

    const cleanStart = start_datetime.replace('T', ' ');
    const cleanEnd = end_datetime.replace('T', ' ');

    const conflictSql = `
        SELECT * FROM reservations 
        WHERE (? < datetime(end_datetime) AND ? > datetime(start_datetime))
    `;

    db.all(conflictSql, [cleanStart, cleanEnd], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Greška pri proveri termina.' });
        if (rows && rows.length > 0) {
            return res.status(409).json({ error: 'Izabrani termin je zauzet.' });
        }

        const insertSql = `INSERT INTO reservations (user_id, person_name, start_datetime, end_datetime, note) VALUES (?, ?, ?, ?, ?)`;
        db.run(insertSql, [currentUserId, currentUserEmail, cleanStart, cleanEnd, note || ''], function(err) {
            if (err) return res.status(500).json({ error: 'Greška pri upisu.' });
            return res.status(201).json({ success: true });
        });
    });
});

// Ruta za brisanje (Admin može sve, običan korisnik samo svoju rezervaciju)
app.delete('/api/reservations/:id', requireAuth, (req, res) => {
    const reservationId = req.params.id;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    // Prvo proveri čija je rezervacija
    db.get(`SELECT * FROM reservations WHERE id = ?`, [reservationId], (err, reservation) => {
        if (err) return res.status(500).json({ error: 'Greška na serveru.' });
        if (!reservation) return res.status(404).json({ error: 'Rezervacija nije pronađena.' });

        // Dozvoli brisanje ako je korisnik admin ILI vlasnik te rezervacije
        const isOwner = reservation.user_id === userId || reservation.person_name === req.session.user.email;
        const isAdmin = userRole === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'Nemate ovlašćenje da obrišete tuđu rezervaciju.' });
        }

        db.run(`DELETE FROM reservations WHERE id = ?`, [reservationId], function(delErr) {
            if (delErr) return res.status(500).json({ error: 'Greška pri brisanju.' });
            return res.json({ success: true });
        });
    });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server pokrenut na http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
    server.close(() => {
        db.close(() => process.exit(0));
    });
});