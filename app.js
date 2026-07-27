// Tvoj API Ključ (ovde unesi svoj ključ)
const API_KEY = 'sb_publishable_n632u0RA4VD8UumfXRNiPQ_Z3dADR5G';
const API_URL = 'https://jartbatdbxckaxwursae.supabase.co/rest/v1/appointments'; // Opciono: Putanja do tvog API backend-a

document.addEventListener('DOMContentLoaded', () => {
  const bookingForm = document.getElementById('bookingForm');
  const appointmentsList = document.getElementById('appointmentsList');

  bookingForm.addEventListener('submit', function(e) {
    e.preventDefault();

    // 1. Prikupljanje vrednosti iz forme
    const name = document.getElementById('name').value;
    const service = document.getElementById('service').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;

    // Struktura objekta termina
    const newAppointment = {
      id: Date.now(),
      name: name,
      service: service,
      date: date,
      time: time
    };

    // 2. Dodavanje kartice na desnu stranu
    addAppointmentToUI(newAppointment);

    // 3. Opciono: Slanje na API servis sa API ključem
    /*
    sendToApi(newAppointment);
    */

    // 4. Resetovanje forme
    bookingForm.reset();
  });

  // Funkcija za prikaz zakazanog termina na desnoj strani
  function addAppointmentToUI(appointment) {
    // Skloni poruku da nema termina ako postoji
    const emptyMsg = appointmentsList.querySelector('.empty-msg');
    if (emptyMsg) {
      emptyMsg.remove();
    }

    // Kreiramo kontejner kartice
    const card = document.createElement('div');
    card.className = 'appointment-card';
    card.setAttribute('data-id', appointment.id);

    // Formatiranje datuma u naš format (DD.MM.YYYY)
    const formattedDate = new Date(appointment.date).toLocaleDateString('sr-RS');

    card.innerHTML = `
      <div class="appointment-info">
        <h3>${appointment.name}</h3>
        <p>📋 ${appointment.service}</p>
      </div>
      <div class="appointment-time">
        <div>📅 ${formattedDate}</div>
        <div>🕒 ${appointment.time} h</div>
        <button class="delete-btn" onclick="removeAppointment(this)">Otkaži</button>
      </div>
    `;

    appointmentsList.prepend(card);
  }

  // Primer funkcije za slanje na externi API servis
  async function sendToApi(data) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}` // Slanje API ključa u zaglavlju
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      console.log('Uspešno poslato na API:', result);
    } catch (error) {
      console.error('Greška pri slanju na API:', error);
    }
  }
});

// Funkcija za uklanjanje termina sa liste
function removeAppointment(button) {
  const card = button.closest('.appointment-card');
  card.remove();

  const appointmentsList = document.getElementById('appointmentsList');
  if (appointmentsList.children.length === 0) {
    appointmentsList.innerHTML = '<p class="empty-msg">Trenutno nema zakazanih termina.</p>';
  }
}