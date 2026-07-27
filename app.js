// Postavi URL tvog API endpointa
const API_BASE_URL = '/api/appointments';

// 1. Primarni API poziv za dohvatanje termina sa servera
async function fetchAppointments(day, month = 7, year = 2026) {
  const container = document.getElementById('appointments-container');
  container.innerHTML = `<div class="no-data">Učitavanje podataka...</div>`;

  try {
    // API POZIV
    const response = await fetch(`${API_BASE_URL}?year=${year}&month=${month}&day=${day}`);
    
    if (!response.ok) {
      throw new Error(`Server greška: ${response.status}`);
    }

    const appointments = await response.json();
    renderAppointments(appointments, day);

  } catch (error) {
    console.warn('API trenutno nije dostupan, prikazujem lokalne podatke za testiranje.', error);
    
    // FALLBACK: Lokalni test podaci u slučaju da backend API još nije podignut
    const mockDb = {
      27: [
        { time: '09:00 - 10:00', title: 'Sistem i infrastruktura', desc: 'Sistemska provera i logovi', status: 'Potvrđeno', pending: false },
        { time: '11:30 - 12:15', title: 'Kids Beba D.O.O.', desc: 'Provera bekap skripte i baze', status: 'Potvrđeno', pending: false },
        { time: '14:00 - 15:00', title: 'Pregled mreže', desc: 'MikroTik i VPN tuneli', status: 'Na čekanju', pending: true }
      ],
      28: [
        { time: '10:00 - 11:00', title: 'Mrežna konfiguracija', desc: 'Podešavanje IPsec profila', status: 'Potvrđeno', pending: false }
      ]
    };

    renderAppointments(mockDb[day] || [], day);
  }
}

// 2. Renderovanje kartica na desnoj strani
function renderAppointments(data, day) {
  const container = document.getElementById('appointments-container');
  container.innerHTML = '';

  if (data && data.length > 0) {
    data.forEach(item => {
      const cardHtml = `
        <div class="appointment-card">
          <div class="time-box">${item.time}</div>
          <div class="info-box">
            <div class="title">${item.title}</div>
            <div class="subtitle">${item.desc}</div>
          </div>
          <span class="status-pill ${item.pending ? 'pending' : ''}">${item.status}</span>
        </div>
      `;
      container.innerHTML += cardHtml;
    });
  } else {
    container.innerHTML = `<div class="no-data">Nema zakazanih termina za ${day}. Jul 2026.</div>`;
  }
}

// 3. Glavna funkcija za klik na datum
function selectDate(day) {
  // Ažuriranje kalendara
  const allDays = document.querySelectorAll('.calendar-day:not(.empty)');
  allDays.forEach(el => {
    if (parseInt(el.textContent) === day) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  // Ažuriranje svetlih ikonica na 2026. godinu na obe strane
  document.getElementById('left-icon-day').textContent = day;
  document.getElementById('right-icon-day').textContent = day;
  document.getElementById('selected-date-text').textContent = `${day}. Jul 2026.`;

  // Poziv API-ja za izabrani dan
  fetchAppointments(day, 7, 2026);
}

// Inicijalno pokretanje za 27. Jul 2026.
document.addEventListener('DOMContentLoaded', () => {
  selectDate(27);
});