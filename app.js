// --- Supabase Klijent Inicijalizacija ---
const SUPABASE_URL = 'https://jartbatdbxckaxwursae.supabase.co';
const SUPABASE_KEY = 'sb_publishable_n632u0RA4VD8UumfXRNiPQ_Z3dADR5G';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Globalna mapa za čuvanje trajanja usluga po ID-ju
let mapaUsluga = {};

// --- 1. Inicijalizacija pri učitavanju stranice ---
window.addEventListener('load', () => {
    const dateInput = document.getElementById('izaberiDatum');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    // Učitavamo padajuće menije i današnje termine
    ucitajPodatke();
    ucitajTermineZaDatum(today);
});

// --- 2. Učitavanje Usluga i Zaposlenih iz SQL baze ---
async function ucitajPodatke() {
    // Povlačenje usluga
    const { data: usluge, error: errUsluge } = await supabaseClient.from('usluge').select('*');
    if (errUsluge) {
        console.error("Greška pri učitavanju usluga:", errUsluge);
    } else if (usluge && usluge.length > 0) {
        const selectUsluga = document.getElementById('usluga');
        selectUsluga.innerHTML = '<option value="">-- Izaberite uslugu --</option>';
        usluge.forEach(u => {
            mapaUsluga[u.id] = u.trajanje_minuti;
            selectUsluga.innerHTML += `<option value="${u.id}">${u.naziv} (${u.trajanje_minuti} min)</option>`;
        });
    }

    // Povlačenje zaposlenih
    const { data: zaposleni, error: errZaposleni } = await supabaseClient.from('zaposleni').select('*');
    if (errZaposleni) {
        console.error("Greška pri učitavanju zaposlenih:", errZaposleni);
    } else if (zaposleni && zaposleni.length > 0) {
        const selectZaposleni = document.getElementById('zaposleni');
        selectZaposleni.innerHTML = '<option value="">-- Izaberite radnika --</option>';
        zaposleni.forEach(z => {
            selectZaposleni.innerHTML += `<option value="${z.id}">${z.ime_prezime}</option>`;
        });
    }
}

// --- 3. Učitavanje termina za izabrani datum ---
async function ucitajTermineZaDatum(datumString) {
    const startOfDay = datumString + "T00:00:00Z";
    const endOfDay = datumString + "T23:59:59Z";

    // SQL JOIN upit koji povlači rezervacije zajedno sa nazivom usluge i imenom radnika
    const { data: termini, error } = await supabaseClient
        .from('rezervacije')
        .select(`
            id,
            datum_vreme_pocetak,
            datum_vreme_kraj,
            klijent_ime,
            klijent_telefon,
            usluge (naziv, trajanje_minuti),
            zaposleni (ime_prezime)
        `)
        .gte('datum_vreme_pocetak', startOfDay)
        .lte('datum_vreme_pocetak', endOfDay)
        .order('datum_vreme_pocetak', { ascending: true });

    if (error) {
        console.error("Greška pri učitavanju termina za raspored:", error);
        return;
    }

    renderujTermine(termini);
}

// --- 4. Renderovanje liste termina u desnoj kartici (Neonski stil) ---
function renderujTermine(termini) {
    const listDiv = document.getElementById('listaTermina');
    listDiv.innerHTML = '';

    if (!termini || termini.length === 0) {
        listDiv.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                <p style="margin: 0; font-weight: 600; font-size: 15px;">Nema zakazanih termina</p>
                <span style="font-size: 13px; opacity: 0.7;">Izaberite drugi datum ili dodajte novu rezervaciju.</span>
            </div>
        `;
        return;
    }

    termini.forEach(term => {
        const pDate = new Date(term.datum_vreme_pocetak);
        const kDate = new Date(term.datum_vreme_kraj);
        
        // Formatiranje sati i minuta (HH:mm)
        const pocetakStr = pDate.getHours().toString().padStart(2, '0') + ':' + pDate.getMinutes().toString().padStart(2, '0');
        const krajStr = kDate.getHours().toString().padStart(2, '0') + ':' + kDate.getMinutes().toString().padStart(2, '0');
        const vreme = `${pocetakStr} - ${krajStr}`;

        const nazivUsluge = term.usluge ? term.usluge.naziv : 'Usluga';
        const imeRadnika = term.zaposleni ? term.zaposleni.ime_prezime : 'Radnik';

        listDiv.innerHTML += `
            <div class="appointment-item">
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <span class="time-box" style="width: fit-content;">${vreme}</span>
                    <div class="client-info" style="margin-top: 4px;">
                        <h4>${term.klijent_ime}</h4>
                        <p>
                            <span>📞 ${term.klijent_telefon}</span> 
                            <span>•</span> 
                            <span style="color: var(--text-color); font-weight: 600;">${nazivUsluge}</span>
                        </p>
                    </div>
                </div>
                <div>
                    <span class="worker-badge">${imeRadnika}</span>
                </div>
            </div>
        `;
    });
}

// --- 5. Event Listener za promenu datuma u kalendaru ---
document.getElementById('izaberiDatum').addEventListener('change', (e) => {
    ucitajTermineZaDatum(e.target.value);
});

// --- 6. Obrada slanja forme za zakazivanje ---
document.getElementById('formaZakazivanje').addEventListener('submit', async (e) => {
    e.preventDefault();

    const uslugaId = document.getElementById('usluga').value;
    const zaposleniId = document.getElementById('zaposleni').value;
    const ime = document.getElementById('klijentIme').value;
    const telefon = document.getElementById('klijentTelefon').value;
    const pocetakUnos = document.getElementById('datumVreme').value;

    const pocetakDatum = new Date(pocetakUnos);
    const trajanjeMinuti = mapaUsluga[uslugaId];
    const krajDatum = new Date(pocetakDatum.getTime() + trajanjeMinuti * 60000);

    const pocetakISO = pocetakDatum.toISOString();
    const krajISO = krajDatum.toISOString();

    const porukaDiv = document.getElementById('poruka');
    porukaDiv.style.display = 'none';

    // KORAK A: Pozivanje SQL funkcije 'proveri_dostupnost' na Supabase-u
    const { data: jeSlobodan, error: errProvera } = await supabaseClient
        .rpc('proveri_dostupnost', {
            p_zaposleni_id: zaposleniId,
            p_pocetak: pocetakISO,
            p_kraj: krajISO
        });

    if (errProvera) {
        console.error("Greška pri proveri dostupnosti:", errProvera);
        prikaziPoruku("Greška pri proveri termina.", false);
        return;
    }

    if (!jeSlobodan) {
        prikaziPoruku("Izabrani radnik je zauzet u tom terminu!", false);
        return;
    }

    // KORAK B: Ako je slobodno, upisujemo u SQL tabelu 'rezervacije'
    const { error: errUpis } = await supabaseClient
        .from('rezervacije')
        .insert([{
            usluga_id: uslugaId,
            zaposleni_id: zaposleniId,
            klijent_ime: ime,
            klijent_telefon: telefon,
            datum_vreme_pocetak: pocetakISO,
            datum_vreme_kraj: krajISO
        }]);

    if (errUpis) {
        console.error("Greška pri čuvanju:", errUpis);
        prikaziPoruku("Greška pri čuvanju rezervacije.", false);
    } else {
        prikaziPoruku("Uspešno ste zakazali termin!", true);
        document.getElementById('formaZakazivanje').reset();

        // Automatski osvežavamo listu termina na desnoj strani za taj datum
        const currentPickerDate = document.getElementById('izaberiDatum').value;
        ucitajTermineZaDatum(currentPickerDate);
    }
});

// Pomoćna funkcija za ispis poruka o statusu
function prikaziPoruku(tekst, jeUspeh) {
    const div = document.getElementById('poruka');
    div.innerText = tekst;
    div.className = jeUspeh ? 'uspeh' : 'greska';
    div.style.display = 'block';
}