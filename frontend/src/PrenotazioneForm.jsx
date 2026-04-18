import { useState, useEffect } from 'react';

function PrenotazioneForm({ idPaziente, onPrenotazione }) {
  const [medici, setMedici] = useState([]);
  
  // Aggiunto lo stato "specializzazione" per il primo filtro
  const [form, setForm] = useState({ 
    specializzazione: '', 
    id_medico: '', 
    data_visita: '', 
    ora_visita: '', 
    motivo_visita: '' 
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/medici`)
      .then(res => res.json())
      .then(data => setMedici(data))
      .catch(err => console.error(err));
  }, []);

  // Estraiamo la lista delle specializzazioni uniche dai medici scaricati
  const specializzazioniUniche = [...new Set(medici.map(m => m.specializzazione))];

  // Filtriamo i medici in base alla specializzazione scelta
  const mediciFiltrati = form.specializzazione 
    ? medici.filter(m => m.specializzazione === form.specializzazione)
    : [];

  // Gestione del cambio specializzazione (azzera il medico se cambi branca)
  const handleSpecializzazioneChange = (e) => {
    setForm({ ...form, specializzazione: e.target.value, id_medico: '' });
  };

  const handleDataChange = (e) => {
    const selectedDate = new Date(e.target.value);
    if (selectedDate.getDay() === 0) { 
      alert("La clinica è chiusa di domenica. Ti preghiamo di selezionare un altro giorno.");
      setForm({ ...form, data_visita: '' }); 
    } else {
      setForm({ ...form, data_visita: e.target.value });
    }
  };

  const handleOraChange = (e) => {
    const time = e.target.value;
    if (time) {
      const hour = parseInt(time.split(':')[0], 10);
      if (hour < 7 || hour >= 19) {
        alert("L'orario delle visite è limitato dalle 07:00 alle 19:00.");
        setForm({ ...form, ora_visita: '' }); 
        return;
      }
    }
    setForm({ ...form, ora_visita: time });
  };

  // Nuova funzione per il tasto Annulla
  const pulisciForm = () => {
    setForm({ specializzazione: '', id_medico: '', data_visita: '', ora_visita: '', motivo_visita: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prepariamo i dati da inviare (al backend non serve la specializzazione, solo l'id_medico)
    const datiDaInviare = {
      id_medico: form.id_medico,
      data_visita: form.data_visita,
      ora_visita: form.ora_visita,
      motivo_visita: form.motivo_visita
    };

    fetch(`${import.meta.env.VITE_API_URL}/api/prenotazioni?id_paziente=${idPaziente}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datiDaInviare)
    }).then(res => {
      if (!res.ok) throw new Error("Errore durante la prenotazione");
      return res.json();
    }).then(() => {
      alert("Prenotazione effettuata con successo!");
      pulisciForm(); // Svuota i campi dopo il successo
      onPrenotazione(); // Ricarica i dati nella Dashboard
    }).catch(err => {
      console.error(err);
      alert("Si è verificato un errore, riprova.");
    });
  };

  return (
    <div className="glass-card">
      <h2 className="section-title">Prenota Nuova Visita</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
          
        {/* STEP 1: Branca Medica */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Scegli Branca Medica</label>
          <select 
            className="form-control" 
            value={form.specializzazione} 
            onChange={handleSpecializzazioneChange} 
            required
          >
            <option value="">-- Seleziona una Specializzazione --</option>
            {specializzazioniUniche.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>

        {/* STEP 2: Scelta del Medico (Disabilitato finché non scegli la branca) */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Scegli Specialista</label>
          <select 
            className="form-control" 
            value={form.id_medico} 
            onChange={e => setForm({...form, id_medico: e.target.value})} 
            required
            disabled={!form.specializzazione}
            style={{ opacity: !form.specializzazione ? 0.5 : 1 }}
          >
            <option value="">-- Seleziona il Medico --</option>
            {mediciFiltrati.map(m => (
              <option key={m.id_medico} value={m.id_medico}>
                Dr. {m.nome} {m.cognome}
              </option>
            ))}
          </select>
        </div>

        {/* STEP 3: Data */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Data Visita (Esclusa Domenica)</label>
          <input 
            type="date" 
            className="form-control" 
            value={form.data_visita} 
            min={today}
            onChange={handleDataChange} 
            required
          />
        </div>

        {/* STEP 4: Orario */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Orario Visita (07:00 - 19:00)</label>
          <input 
            type="time" 
            className="form-control" 
            value={form.ora_visita} 
            onChange={handleOraChange} 
            required
          />
        </div>

        {/* STEP 5: Motivo */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Motivo Visita</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Es. Visita di controllo, dolore articolare..." 
            value={form.motivo_visita} 
            onChange={e => setForm({...form, motivo_visita: e.target.value})} 
            required 
          />
        </div>

        {/* Pulsantiera: Conferma e Annulla */}
        <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
          <button type="submit" className="glass-button" style={{ flex: 2 }}>
            CONFERMA PRENOTAZIONE
          </button>
          
          <button 
            type="button" 
            onClick={pulisciForm}
            className="glass-button" 
            style={{ 
              flex: 1, 
              background: 'rgba(255, 255, 255, 0.1)', 
              color: '#e5e5e7',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            ANNULLA
          </button>
        </div>

      </form>
    </div>
  );
}

export default PrenotazioneForm;