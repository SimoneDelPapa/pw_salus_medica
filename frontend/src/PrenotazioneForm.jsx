import { useState, useEffect } from 'react';

/**
 * Componente per la gestione del modulo di prenotazione delle visite mediche.
 * Permette al paziente di filtrare i medici per specializzazione, scegliere una data valida,
 * e selezionare uno slot orario disponibile (verificando in tempo reale le occupazioni lato server).
 * * @param {Object} props
 * @param {number} props.idPaziente - Identificativo univoco del paziente loggato.
 * @param {Function} props.onPrenotazione - Callback invocata in caso di successo per aggiornare la dashboard genitore.
 */
function PrenotazioneForm({ idPaziente, onPrenotazione }) {
  const [medici, setMedici] = useState([]);
  
  const [form, setForm] = useState({ 
    specializzazione: '', 
    id_medico: '', 
    data_visita: '', 
    ora_visita: '', 
    motivo_visita: '' 
  });

  const [orariOccupati, setOrariOccupati] = useState([]);
  const slotsOrari = [
    "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/medici`)
      .then(res => res.json())
      .then(data => setMedici(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (!form.id_medico || !form.data_visita) {
      return; 
    }

    fetch(`${import.meta.env.VITE_API_URL}/api/medico/${form.id_medico}/orari-occupati?data=${form.data_visita}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Errore server: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data.occupati)) {
          setOrariOccupati(data.occupati);
        } else {
          setOrariOccupati([]);
        }
      })
      .catch(err => {
        console.error("Errore nel caricamento degli orari occupati:", err);
        setOrariOccupati([]); 
      });
  }, [form.id_medico, form.data_visita]);

  const specializzazioniUniche = [...new Set(medici.map(m => m.specializzazione))];

  const mediciFiltrati = form.specializzazione 
    ? medici.filter(m => m.specializzazione === form.specializzazione)
    : [];

  // EVENT HANDLER 1: Svuota gli orari quando cambi la branca medica
  const handleSpecializzazioneChange = (e) => {
    setForm({ ...form, specializzazione: e.target.value, id_medico: '', ora_visita: '' });
    setOrariOccupati([]); 
  };

  // EVENT HANDLER 2: Svuota gli orari quando cambi la data
  const handleDataChange = (e) => {
    const selectedDate = new Date(e.target.value);
    if (selectedDate.getDay() === 0) { 
      alert("La clinica risulta chiusa di domenica. Si prega di selezionare una data alternativa.");
      setForm({ ...form, data_visita: '', ora_visita: '' }); 
    } else {
      setForm({ ...form, data_visita: e.target.value, ora_visita: '' });
    }
    setOrariOccupati([]); 
  };

  const isSlotNelPassato = (slot) => {
    const oggi = new Date();
    const dataOggiStr = oggi.toISOString().split('T')[0];
    
    if (form.data_visita < dataOggiStr) return true;
    
    if (form.data_visita === dataOggiStr) {
      const [oraSlot] = slot.split(':').map(Number);
      const oraAttuale = oggi.getHours();
      return oraSlot <= oraAttuale; 
    }
    
    return false;
  };

  // EVENT HANDLER 3: Svuota gli orari quando annulli o pulisci il form
  const pulisciForm = () => {
    setForm({ specializzazione: '', id_medico: '', data_visita: '', ora_visita: '', motivo_visita: '' });
    setOrariOccupati([]); 
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!form.ora_visita) {
      alert("Errore: Seleziona un orario.");
      return;
    }

    const datiDaInviare = {
      id_medico: parseInt(form.id_medico, 10),
      data_visita: form.data_visita,
      ora_visita: form.ora_visita,
      motivo_visita: form.motivo_visita
    };

    console.log("Invio al backend:", JSON.stringify(datiDaInviare));

    fetch(`${import.meta.env.VITE_API_URL}/api/prenotazioni?id_paziente=${idPaziente}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datiDaInviare)
    })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || JSON.stringify(data));
      }
      return data;
    })
    .then(() => {
      alert("Prenotazione confermata!");
      pulisciForm();
      onPrenotazione();
    })
    .catch(err => {
      console.error("Errore dettagliato:", err);
      alert(`Errore di prenotazione: ${err.message}`);
    });
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <i className="fa-regular fa-calendar-plus" style={{ fontSize: '1.5rem', color: '#93c47d' }}></i>
        <h2 className="section-title-small" style={{ margin: 0, color: '#93c47d', fontSize: '1.3rem' }}>Prenota Nuova Visita</h2>
      </div>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
          
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

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Scegli Specialista</label>
          {/* EVENT HANDLER 4: Svuota gli orari quando selezioni un medico diverso */}
          <select 
            className="form-control" 
            value={form.id_medico} 
            onChange={e => {
              setForm({...form, id_medico: e.target.value, ora_visita: ''});
              setOrariOccupati([]); 
            }} 
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

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Data Visita (Esclusa Domenica)</label>
          <input 
            type="date" 
            className="form-control" 
            value={form.data_visita} 
            min={today}
            onChange={handleDataChange} 
            required
            style={{ colorScheme: 'dark' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>Orario Visita</label>
          
          {!form.data_visita || !form.id_medico ? (
            <div style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px', textAlign: 'center' }}>
              <p style={{ color: '#a1a1aa', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>
                Seleziona prima uno specialista e una data per visualizzare le disponibilità in tempo reale.
              </p>
            </div>
          ) : (
            <div className="grid-slots">
              {slotsOrari.map(slot => {
                const occupato = orariOccupati.includes(slot);
                const passato = isSlotNelPassato(slot);
                const disabilitato = occupato || passato;
                const selezionato = form.ora_visita === slot;

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={disabilitato}
                    onClick={() => setForm(prev => ({ ...prev, ora_visita: slot }))}
                    className={`slot-button ${selezionato ? 'selected' : ''} ${occupato ? 'occupied' : ''}`}
                  >
                    {slot}
                    {occupato && <span className="slot-badge">Occupato</span>}
                    {passato && !occupato && <span className="slot-badge" style={{ color: '#555' }}>Passato</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Motivo Visita</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Es. Visita di controllo periodica, algia acuta..." 
            value={form.motivo_visita} 
            onChange={e => setForm({...form, motivo_visita: e.target.value})} 
            required 
          />
        </div>

        <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
          <button type="submit" className="glass-button" style={{ flex: 2 }} disabled={!form.ora_visita}>
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