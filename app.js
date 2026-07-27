// Tvoj Supabase API Ključ i URL
const API_KEY = 'sb_publishable_n632u0RA4VD8UumfXRNiPQ_Z3dADR5G';
const API_URL = 'https://jartbatdbxckaxwursae.supabase.co/rest/v1/appointments';

document.addEventListener('DOMContentLoaded', () => {
  const bookingForm = document.getElementById('bookingForm');
  const appointmentsList = document.querySelector('.appointments-list') || document.getElementById('appointmentsList');

  if (!bookingForm) return;

  bookingForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    // 1. Prikupljanje vrednosti iz forme
    const clientName = document.getElementById('name')?.value || 'Nenavedeno ime';
    const service = document.getElementById('service')?.value || 'Usluga';
    const date = document.getElementById('date')?.value || '';
    const time = document.getElementById('time')?.value || '';
    const worker = document.getElementById('worker')?.value || 'Radnik';

    // Objekat za UI i bazu
    const newAppointment = {
      id: Date.now(),
      name: clientName,
      service: service,
      date: date,
      time: time,
      worker: worker
    };

    // 2. Odmah prikaži karticu u tvojim neonskim stilovima sa desne strane
    addAppointmentToUI(newAppointment);

    // 3. Pošalji podatke u Supabase bazu
    await sendToApi(newAppointment);

    // 4. Resetuj formu i prikaži poruku ako postoji
    bookingForm.reset();
    
    const poruka = document.getElementById('poruka');
    if (poruka) {
      poruka.className = 'uspeh';
      poruka.innerText = 'Termin uspešno zakazan!';
      poruka.style.display = 'block';
      setTimeout(() => { poruka.style.display = 'none'; }, 3000);
    }
  });

  // Funkcija za prikaz zakazanog termina po tvom neonskom CSS dizajnu
  function addAppointmentToUI(appointment) {
    if (!appointmentsList) return;

    // Skloni poruku da nema termina ako postoji
    const emptyMsg = appointmentsList.querySelector('.empty-msg');
    if (emptyMsg) {
      emptyMsg.remove();
    }

    const formattedDate = appointment.date 
      ? new Date(appointment.date).toLocaleDateString('sr-RS') 
      : '';

    // Kreiramo element sa tvom .appointment-item klasom
    const item = document.createElement('div');
    item.className = 'appointment-item';
    item.setAttribute('data-id', appointment.id);

    item.innerHTML = `
      <div class="client-info">
        <h4>${appointment.name}</h4>
        <p>📋 ${appointment.service} ${formattedDate ? '• 📅 ' + formattedDate : ''}</p>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span class="worker-badge">${appointment.worker}</span>
        <span class="time-box">🕒 ${appointment.time}</span>
        <button onclick="removeAppointment(this)" style="background:none; border:none; color:#ff4d4d; cursor:pointer; font-weight:700; margin-left:8px;">✕</button>
      </div>
    `;

    appointmentsList.prepend(item);
  }

  // Funkcija za slanje u Supabase bazu
  async function sendToApi(data) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': API_KEY,
          'Authorization': `Bearer ${API_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Server odgovorio sa statusom: ${response.status}`);
      }
      
      console.log('Uspešno upisano u Supabase bazu!');
    } catch (error) {
      console.error('Greška pri slanju na API:', error);
    }
  }
});

// Funkcija za brisanje sa liste na klik
function removeAppointment(button) {
  const item = button.closest('.appointment-item');
  if (item) {
    item.remove();
  }

  const appointmentsList = document.querySelector('.appointments-list') || document.getElementById('appointmentsList');
  if (appointmentsList && appointmentsList.children.length === 0) {
    appointmentsList.innerHTML = '<p class="empty-msg" style="color: var(--text-muted); text-align: center;">Trenutno nema zakazanih termina.</p>';
  }
}