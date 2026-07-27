let currentSelectedDay = 27;

// Baza rezervacija za firmin auto (Škoda Octavia)
const carReservations = {
  12: { person: 'Marko Nikolić', car: 'Škoda Octavia', status: 'Rezervisano' },
  18: { person: 'Milan Petrović', car: 'Škoda Octavia', status: 'Rezervisano' },
  27: { person: 'Uroš Vuletić', car: 'Škoda Octavia', status: 'Rezervisano' }
};

// Funkcija za odabir dana
function selectDate(day) {
  currentSelectedDay = day;

  // 1. Osveži selekciju u kalendaru i dodaj tačkice na zauzete dane
  const allDays = document.querySelectorAll('.calendar-day:not(.empty)');
  allDays.forEach(el => {
    const dayNum = parseInt(el.textContent);
    
    if (dayNum === day) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }

    if (carReservations[dayNum]) {
      el.classList.add('has-events');
    } else {
      el.classList.remove('has-events');
    }
  });

  // 2. Osveži svetle ikonice
  document.getElementById('left-icon-day').textContent = day;
  document.getElementById('right-icon-day').textContent = day;
  document.getElementById('selected-date-text').textContent = `${day}. Jul 2026.`;

  // 3. Prikazi detalje i osveži sitne tabove
  renderReservation(day);
  renderReservedTabs();
}

// Prikaz detalja rezervacije u desnoj kartici
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

// Generisanje sitnih tabova sa autićima za sve zauzete dane u mesecu
function renderReservedTabs() {
  const container = document.getElementById('reserved-tabs-container');
  container.innerHTML = '';

  // Dobijamo sve dane koji imaju rezervaciju i sortiramo ih rastuće
  const reservedDays = Object.keys(carReservations).map(Number).sort((a, b) => a - b);

  if (reservedDays.length === 0) {
    container.innerHTML = '<div style="font-size: 12px; color: #64748b;">Nema rezervacija za ovaj mesec.</div>';
    return;
  }

  reservedDays.forEach(day => {
    const tab = document.createElement('div');
    tab.className = `mini-tab ${day === currentSelectedDay ? 'active-tab' : ''}`;
    tab.onclick = () => selectDate(day);

    tab.innerHTML = `
      <span>🚗</span>
      <span>${day}. Jul</span>
      <span class="tab-status">Rezervisano</span>
    `;

    container.appendChild(tab);
  });
}

// Modal Kontrole
function openModal() {
  document.getElementById('person-name').value = '';
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

// Potvrda rezervacije
function confirmReservation() {
  const nameInput = document.getElementById('person-name').value.trim();

  if (!nameInput) {
    alert('Molimo vas unesite ime i prezime.');
    return;
  }

  // Dodaj ili promeni rezervaciju za selektovani dan
  carReservations[currentSelectedDay] = {
    person: nameInput,
    car: 'Škoda Octavia',
    status: 'Rezervisano'
  };

  closeModal();
  selectDate(currentSelectedDay); // Osvežava kalendar, karticu i sitne tabove
}

// Inicijalno učitavanje
document.addEventListener('DOMContentLoaded', () => {
  selectDate(27);
});