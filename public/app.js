let currentUser = { id: null, name: "Korisnik", role: "user" };
let reservationToDeleteId = null;
let allReservations = [];
let editingReservationId = null; // null = kreiranje nove, broj = izmena postojeće

// Pošto koristimo defer u HTML-u, DOM je spreman, ali window.onload osigurava redosled
window.onload = () => {
    loadCurrentUser().then(() => {
        setupDateInputs();
        loadReservations();
        setupSidebarEvents();
        setupLogout();
    });
};

// Bezbedno pretvaranje teksta u HTML-safe string (sprečava XSS)
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function loadCurrentUser() {
    try {
        const res = await fetch('/api/session', {
            credentials: 'include' // <--- KLJUČNO
        });
        if (res.ok) {
            const data = await res.json();
            currentUser = data;
            const displayName = currentUser.name || currentUser.displayName || currentUser.email || 'Korisnik';
            
            // Bezbedno postavljanje naziva i avatara ako elementi postoje na stranici
            const userDisplayEl = document.getElementById('user-display');
            if (userDisplayEl) userDisplayEl.innerText = escapeHtml(displayName);

            const userAvatarEl = document.getElementById('user-avatar');
            if (userAvatarEl) userAvatarEl.innerText = displayName.charAt(0).toUpperCase();

            // Kompatibilnost sa starim ID-jem (currentUserBadge iz index.html)
            const userBadgeEl = document.getElementById('currentUserBadge');
            if (userBadgeEl) userBadgeEl.innerText = escapeHtml(displayName);
        } else {
            window.location.href = '/login.html';
        }
    } catch (err) {
        console.error('Greška pri učitavanju sesije:', err);
    }
}

function setupDateInputs() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const minIso = now.toISOString().slice(0, 16);

    const startInput = document.getElementById('start_datetime');
    const endInput = document.getElementById('end_datetime');

    if (!startInput || !endInput) return;

    startInput.min = minIso;
    endInput.min = minIso;

    startInput.addEventListener('change', () => {
        if (!startInput.value) return;
        const startDate = new Date(startInput.value);
        const minEnd = new Date(startDate.getTime() + 60 * 60 * 1000);
        minEnd.setMinutes(minEnd.getMinutes() - minEnd.getTimezoneOffset());
        endInput.min = minEnd.toISOString().slice(0, 16);

        if (!endInput.value || new Date(endInput.value) < minEnd) {
            endInput.value = minEnd.toISOString().slice(0, 16);
        }
    });
}

async function loadReservations() {
    const listContainer = document.getElementById('reservations-list') || document.getElementById('reservationsContainer');
    if (!listContainer) return;

    try {
        const res = await fetch('/api/reservations', {
            credentials: 'include' // <--- KLJUČNO
        });
        if (!res.ok) throw new Error('Server error');
        allReservations = await res.json();

        if (!Array.isArray(allReservations) || allReservations.length === 0) {
            listContainer.innerHTML = '<p class="empty-msg">Nema aktivnih rezervacija.</p>';
            renderTimeline([]);
            return;
        }

        listContainer.innerHTML = allReservations.map(r => {
            const isOwner = r.user_id === currentUser.id || r.person_name === currentUser.name || r.person_name === currentUser.email;
            const isAdmin = currentUser.role === 'admin';
            const canControl = isOwner || isAdmin;

            return `
                <div class="res-item">
                    <div class="res-info">
                        <strong>${escapeHtml(r.person_name)}</strong>
                        <small>Od: ${escapeHtml(new Date(r.start_datetime).toLocaleString('sr-RS'))}</small>
                        <small>Do: ${escapeHtml(new Date(r.end_datetime).toLocaleString('sr-RS'))}</small>
                        ${r.note ? `<p class="res-note">"${escapeHtml(r.note)}"</p>` : ''}
                    </div>
                    <div class="res-actions">
                        ${canControl ? `<button class="btn-edit" onclick="startEditReservation(${Number(r.id)})" title="Izmeni">✎</button>` : ''}
                        ${canControl ? `<button class="btn-del" onclick="openDeleteModal(${Number(r.id)})" title="Obriši">✕</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        renderTimeline(allReservations);

    } catch (err) {
        console.error('Greška pri učitavanju rezervacija:', err);
        listContainer.innerHTML = '<p class="empty-msg">Greška pri učitavanju rezervacija. Pokušajte ponovo.</p>';
        renderTimeline([]);
    }
}

// Grupisanje po mesecima u bočnom panelu (timeline)
function renderTimeline(reservations) {
    const container = document.getElementById('timeline-container');
    if (!container) return;

    if (!reservations || reservations.length === 0) {
        container.innerHTML = '<p class="empty-msg">Nema zauzetih termina.</p>';
        return;
    }

    const sorted = [...reservations].sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    const groupedByMonth = {};
    sorted.forEach(r => {
        const dateObj = new Date(r.start_datetime);
        const monthYear = dateObj.toLocaleDateString('sr-RS', { month: 'long', year: 'numeric' });
        const formattedMonth = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);

        if (!groupedByMonth[formattedMonth]) {
            groupedByMonth[formattedMonth] = [];
        }
        groupedByMonth[formattedMonth].push(r);
    });

    let htmlContent = '';
    for (const [monthName, items] of Object.entries(groupedByMonth)) {
        htmlContent += `
            <div class="month-group">
                <div class="month-header">
                    <span class="month-icon">📅</span>
                    <h4>${escapeHtml(monthName)}</h4>
                </div>
                <div class="month-items">
        `;

        items.forEach(r => {
            const start = new Date(r.start_datetime);
            const end = new Date(r.end_datetime);

            const dateStr = start.toLocaleDateString('sr-RS', { weekday: 'short', day: 'numeric', month: 'short' });
            const timeStartStr = start.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
            const timeEndStr = end.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });

            htmlContent += `
                <div class="timeline-card">
                    <div class="timeline-date">${escapeHtml(dateStr)}</div>
                    <div class="timeline-body">
                        <div class="timeline-user">
                            <span class="status-dot-red"></span>
                            <strong>${escapeHtml(r.person_name)}</strong>
                        </div>
                        <div class="timeline-time">${escapeHtml(timeStartStr)} - ${escapeHtml(timeEndStr)}</div>
                        ${r.note ? `<div class="timeline-note">${escapeHtml(r.note)}</div>` : ''}
                    </div>
                </div>
            `;
        });

        htmlContent += `
                </div>
            </div>
        `;
    }

    container.innerHTML = htmlContent;
}

function setupSidebarEvents() {
    const sidebar = document.getElementById('sidebar-timeline');
    const overlay = document.getElementById('sidebar-overlay');
    const btnOpen = document.getElementById('btn-toggle-sidebar');
    const btnClose = document.getElementById('btn-close-sidebar');

    if (!btnOpen || !sidebar) return;

    function openSidebar() {
        sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }

    btnOpen.addEventListener('click', openSidebar);
    if (btnClose) btnClose.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
}

function setupLogout() {
    const btnLogout = document.getElementById('btn-logout');
    const logoutForm = document.querySelector('form[action="/api/logout"]');

    const handleLogout = async (e) => {
        if (e) e.preventDefault();
        try {
            const res = await fetch('/api/logout', { 
                method: 'POST',
                credentials: 'include' // <--- KLJUČNO
            });
            const data = await res.json();
            if (data.success) {
                window.location.href = '/login.html';
                return;
            }
        } catch (err) {
            console.error('Greška pri odjavi na serveru:', err);
        } finally {
            window.location.href = '/login.html';
        }
    };

    if (btnLogout) btnLogout.addEventListener('click', handleLogout);
    if (logoutForm) logoutForm.addEventListener('submit', handleLogout);
}

function toDatetimeLocalValue(dbDateStr) {
    const iso = dbDateStr.replace(' ', 'T');
    return iso.slice(0, 16);
}

function startEditReservation(id) {
    const reservation = allReservations.find(r => r.id === id);
    if (!reservation) return;

    editingReservationId = id;

    document.getElementById('start_datetime').value = toDatetimeLocalValue(reservation.start_datetime);
    document.getElementById('end_datetime').value = toDatetimeLocalValue(reservation.end_datetime);
    document.getElementById('note').value = reservation.note || '';

    const bookingForm = document.getElementById('booking-form') || document.getElementById('reservationForm');
    const submitBtn = bookingForm ? bookingForm.querySelector('button[type="submit"]') : null;
    if (submitBtn) submitBtn.innerText = 'Sačuvaj izmenu';

    const cancelBtn = document.getElementById('btn-cancel-edit');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';

    const sectionTitle = document.querySelector('.booking-section h2');
    if (sectionTitle) sectionTitle.innerText = 'Izmena rezervacije';

    if (bookingForm) bookingForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEdit() {
    editingReservationId = null;
    const bookingForm = document.getElementById('booking-form') || document.getElementById('reservationForm');
    if (bookingForm) bookingForm.reset();
    setupDateInputs();

    const submitBtn = bookingForm ? bookingForm.querySelector('button[type="submit"]') : null;
    if (submitBtn) submitBtn.innerText = 'Kreiraj rezervaciju';

    const cancelBtn = document.getElementById('btn-cancel-edit');
    if (cancelBtn) cancelBtn.style.display = 'none';

    const sectionTitle = document.querySelector('.booking-section h2');
    if (sectionTitle) sectionTitle.innerText = 'Nova rezervacija';

    const alertBox = document.getElementById('form-alert');
    if (alertBox) alertBox.style.display = 'none';
}

// FORMA SUBMIT
const bookingForm = document.getElementById('booking-form') || document.getElementById('reservationForm');
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertBox = document.getElementById('form-alert') || document.getElementById('alertBox');
        if (alertBox) alertBox.style.display = 'none';

        const start = document.getElementById('start_datetime').value;
        const end = document.getElementById('end_datetime').value;
        const note = document.getElementById('note').value;

        if (!start || !end) {
            if (alertBox) {
                alertBox.className = 'alert-box alert-err';
                alertBox.innerText = 'Molimo unesite oba datuma.';
                alertBox.style.display = 'block';
            }
            return;
        }

        if (new Date(end) <= new Date(start)) {
            if (alertBox) {
                alertBox.className = 'alert-box alert-err';
                alertBox.innerText = 'Datum završetka mora biti posle datuma početka.';
                alertBox.style.display = 'block';
            }
            return;
        }

        const isEditing = editingReservationId !== null;
        const url = isEditing ? `/api/reservations/${editingReservationId}` : '/api/reservations';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // <--- KLJUČNO
                body: JSON.stringify({ start_datetime: start, end_datetime: end, note })
            });

            const data = await res.json();
            if (res.ok) {
                cancelEdit();
                if (alertBox) {
                    alertBox.className = 'alert-box alert-ok';
                    alertBox.innerText = isEditing ? 'Rezervacija uspešno izmenjena!' : 'Rezervacija uspešno kreirana!';
                    alertBox.style.display = 'block';
                }
                await loadReservations();
            } else {
                if (alertBox) {
                    alertBox.className = 'alert-box alert-err';
                    alertBox.innerText = data.error || 'Greška pri kreiranju.';
                    alertBox.style.display = 'block';
                }
            }
        } catch (err) {
            console.error('Greška pri slanju rezervacije:', err);
            if (alertBox) {
                alertBox.className = 'alert-box alert-err';
                alertBox.innerText = 'Greška u komunikaciji sa serverom. Pokušajte ponovo.';
                alertBox.style.display = 'block';
            }
        }
    });
}

// MODAL DELETE
function openDeleteModal(id) {
    reservationToDeleteId = id;
    const modalAlert = document.getElementById('delete-modal-alert');
    if (modalAlert) modalAlert.style.display = 'none';
    const overlay = document.getElementById('delete-modal-overlay') || document.getElementById('deleteThreeModal');
    if (overlay) overlay.style.display = 'flex';
}

function closeDeleteModal() {
    reservationToDeleteId = null;
    const overlay = document.getElementById('delete-modal-overlay') || document.getElementById('deleteThreeModal');
    if (overlay) overlay.style.display = 'none';
}

const btnCancelDel = document.getElementById('btn-cancel-delete');
if (btnCancelDel) btnCancelDel.addEventListener('click', closeDeleteModal);

const btnConfirmDel = document.getElementById('btn-confirm-delete') || document.getElementById('confirmDeleteBtn');
if (btnConfirmDel) {
    btnConfirmDel.addEventListener('click', async () => {
        if (!reservationToDeleteId) return;
        const modalAlert = document.getElementById('delete-modal-alert');
        try {
            const res = await fetch(`/api/reservations/${reservationToDeleteId}`, { 
                method: 'DELETE',
                credentials: 'include' // <--- KLJUČNO
            });
            if (!res.ok) {
                let msg = 'Brisanje nije uspelo.';
                try {
                    const data = await res.json();
                    if (data.error) msg = data.error;
                } catch (_) {}
                if (modalAlert) {
                    modalAlert.innerText = msg;
                    modalAlert.style.display = 'block';
                }
                return;
            }
            closeDeleteModal();
            await loadReservations();
        } catch (err) {
            console.error('Greška pri brisanju rezervacije:', err);
            if (modalAlert) {
                modalAlert.innerText = 'Greška u komunikaciji sa serverom.';
                modalAlert.style.display = 'block';
            }
        }
    });
}