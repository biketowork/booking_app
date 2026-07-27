// Osnovni URL tvog backend API-ja (promeni port/putanju po potrebi)
const API_BASE_URL = 'http://localhost:3000/api'; 

// Funkcija za preuzimanje termina sa servera za izabrani dan
async function fetchAppointments(day, month = 7, year = 2026) {
  const container = document.getElementById('appointments-container');
  
  // Prikazujemo indikator učitavanja dok čekamo odgovor
  container.innerHTML = `<div class="no-data">Učitavanje termina...</div>`;

  try {
    // 1. API POZIV (GET zahtev)
    const response = await fetch(`${API_BASE_URL}/appointments?year=${year}&month=${month}&day=${day}`);
    
    if (!response.ok) {
      throw new Error(`Greška na serveru: ${response.status}`);
    }

    const data = await response.json(); // Bekend vraća niz termina

    // Renderovanje dobijenih podataka
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

  } catch (error) {
    console.error('Greška pri dohvatnju termina:', error);
    container.innerHTML = `<div class="no-data" style="color: #ef4444;">Neuspešno učitavanje podataka.</div>`;
  }
}

// Funkcija za odabir dana (poziva API)
function selectDate(day) {
  // 1. Ažuriranje aktivnog dana u kalendaru
  const allDays = document.querySelectorAll('.calendar-day:not(.empty)');
  allDays.forEach(el => {
    if (parseInt(el.textContent) === day) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  // 2. Ažuriranje ikonica na obe strane
  document.getElementById('left-icon-day').textContent = day;
  document.getElementById('right-icon-day').textContent = day;
  document.getElementById('selected-date-text').textContent = `${day}. Jul 2026.`;

  // 3. POZIV API-JA ZA IZABRANI DAN
  fetchAppointments(day, 7, 2026);
}

// Inicijalno učitavanje pri otvaranju stranice
document.addEventListener('DOMContentLoaded', () => {
  selectDate(27);
});