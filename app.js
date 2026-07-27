let currentSelectedDay = 27;

// Baza rezervacija za firmin auto (Škoda Octavia)
// Ostavljamo samo 12. i 18. kao zauzete da možeš slobodno da testiraš rezervaciju na 27. Julu ili drugim danima
const carReservations = {
  12: { person: 'Marko Nikolić', car: 'Škoda Octavia', status: 'Rezervisano' },
  18: { person: 'Milan Petrović', car: 'Škoda Octavia', status: 'Rezervisano' }
};

// Funkcija za odabir dana
function selectDate(day) {
  currentSelectedDay = day;

  // 1. Osveži selekciju u kalendaru i obeleži zauzete dane crvenim tabom
  const allDays = document.querySelectorAll('.calendar-day:not(.empty)');
  allDays.forEach(el => {
    const dayNum = parseInt(el.textContent);
    
    // Provera da li je trenutno selektovan dan
    if (dayNum === day) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }

    // Provera da li je dan zauzet
    if (carReservations[dayNum]) {
      el.classList.add('is-reserved');
    } else {
      el.classList.remove('is-reserved');
    }
  });

  // 2. Osveži svetle ikonice
  document.getElementById('left-icon-day').textContent = day;
  document.getElementById('right-icon-day').textContent = day;
  document.getElementById('selected-date-text').textContent = `${day}. Jul 2026.`;

  // 3. Prikaži detalje i osveži sitne tabove sa desne strane
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
  // Provera pre otvaranja modala
  if (carReservations[currentSelectedDay]) {
    const existingPerson = carReservations[currentSelectedDay].person;
    alert(`Datum ${currentSelectedDay}. Jul je već rezervisao/la ${existingPerson}.\n\nAko želite da napravite rezervaciju, izaberite drugi (slobodan) dan u kalendaru.`);
    return;
  }

  // Postavi izabrani datum u modal da korisnik vidi šta rezerviše
  const modalDateEl = document.getElementById('modal-selected-date');
  if (modalDateEl) {
    modalDateEl.value = `${currentSelectedDay}. Jul 2026.`;
  }

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

  // Provera zauzetosti pre čuvanja
  if (carReservations[currentSelectedDay]) {
    alert(`Ovaj datum je u međuvremenu već rezervisao ${carReservations[currentSelectedDay].person}.`);
    closeModal();
    return;
  }

  // Upisujemo novu rezervaciju
  carReservations[currentSelectedDay] = {
    person: nameInput,
    car: 'Škoda Octavia',
    status: 'Rezervisano'
  };

  closeModal();
  selectDate(currentSelectedDay); // Osveži kalendar, karticu i tabove
}

// Inicijalno učitavanje
document.addEventListener('DOMContentLoaded', () => {
  selectDate(27);
});