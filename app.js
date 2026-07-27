// Baza rezervacija za firmin auto (Škoda Octavia)
let currentSelectedDay = 27;

// Unapred popunjeni podaci za demonstraciju
const carReservations = {
  27: {
    person: 'Uroš Vuletić',
    car: 'Škoda Octavia',
    status: 'Rezervisano'
  }
};

// Funkcija za odabir dana
function selectDate(day) {
  currentSelectedDay = day;

  // 1. Osveži selekciju u kalendaru
  const allDays = document.querySelectorAll('.calendar-day:not(.empty)');
  allDays.forEach(el => {
    const dayNum = parseInt(el.textContent);
    if (dayNum === day) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }

    // Dodaj tačkicu ako dan ima rezervaciju
    if (carReservations[dayNum]) {
      el.classList.add('has-events');
    } else {
      el.classList.remove('has-events');
    }
  });

  // 2. Osveži svetle ikonice na 2026. godinu
  document.getElementById('left-icon-day').textContent = day;
  document.getElementById('right-icon-day').textContent = day;
  document.getElementById('selected-date-text').textContent = `${day}. Jul 2026.`;

  // 3. Prikaži rezervaciju za taj dan ako postoji
  renderReservation(day);
}

// Prikaz kartice sa imenom i prezimenom
function renderReservation(day) {
  const container = document.getElementById('appointments-container');
  container.innerHTML = '';

  const reservation = carReservations[day];

  if (reservation) {
    container.innerHTML = `
      <div class="appointment-card">
        <div class="car-badge">🚗 ${reservation.car}</div>
        <div class="info-box">
          <div class="title">${reservation.person}</div>
          <div class="subtitle">Rezervisan firmin automobil</div>
        </div>
        <span class="status-pill">${reservation.status}</span>
      </div>
    `;
  } else {
    container.innerHTML = `<div class="no-data">Automobil je slobodan za ${day}. Jul 2026.</div>`;
  }
}

// Modal Kontrole
function openModal() {
  document.getElementById('person-name').value = '';
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

// Potvrda rezervacije na klik "Potvrdi"
function confirmReservation() {
  const nameInput = document.getElementById('person-name').value.trim();

  if (!nameInput) {
    alert('Molimo vas unesite ime i prezime.');
    return;
  }

  // Sačuvaj rezervaciju za izabrani dan
  carReservations[currentSelectedDay] = {
    person: nameInput,
    car: 'Škoda Octavia',
    status: 'Rezervisano'
  };

  closeModal();
  selectDate(currentSelectedDay); // Osveži prikaz
}

// Inicijalizacija pri učitavanju
document.addEventListener('DOMContentLoaded', () => {
  selectDate(27);
});