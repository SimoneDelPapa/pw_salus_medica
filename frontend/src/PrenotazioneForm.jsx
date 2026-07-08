import { useState, useEffect } from 'react';

/**
 * Componente per l'acquisizione e la validazione dei dati di prenotazione clinica.
 * Implementa la logica di filtering degli slot orari interrogando il backend
 * in base alla data e al medico preselezionato dalla Dashboard genitore.
 * * @param {Object} props
 * @param {number} props.idPaziente - ID relazionale del paziente loggato.
 * @param {Function} props.onPrenotazione - Callback per forzare l'aggiornamento dei dati in Dashboard.
 * @param {Object} props.medicoSelezionato - Dati del medico scelto nella UI genitore.
 */
function PrenotazioneForm({ idPaziente, onPrenotazione, medicoSelezionato }) {
  const [dataVisita, setDataVisita] = useState('');
  const [oraVisita, setOraVisita] = useState('');
  const [motivo, setMotivo] = useState('');
  
  const [orariOccupati, setOrariOccupati] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messaggio, setMessaggio] = useState({ testo: '', tipo: '' });

  // Array degli slot orari standard (es. 09:00 - 17:30)
  const orariDisponibili = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
  ];

  const oggi = new Date().toISOString().split('T')[0];

  /**
   * Effect Hook: Reagisce ai cambiamenti di data o di medico.
   * Interroga il backend per escludere gli orari già allocati.
   */
  useEffect(() => {
    if (!medicoSelezionato || !dataVisita) {
      setOrariOccupati([]);
      setOraVisita('');
      return;
    }

    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/api/medico/${medicoSelezionato.id_medico}/orari-occupati?data=${dataVisita}`)
      .then(res => res.json())
      .then(data => {
        setOrariOccupati(data.occupati || []);
        // Reset orario se quello selezionato in precedenza non è più valido
        if (data.occupati?.includes(oraVisita)) setOraVisita('');
      })
      .catch(err => {
        console.error("Errore fetch orari:", err);
        setOrariOccupati([]);
      })
      .finally(() => setLoading(false));
  }, [medicoSelezionato, dataVisita]); // Dipendenze rigorose per evitare loop

  /**
   * Gestisce l'inoltro della prenotazione al backend (API Gateway).
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessaggio({ testo: 'Elaborazione in corso...', tipo: 'info' });
    setLoading(true);

    if (!medicoSelezionato || !dataVisita || !oraVisita || !motivo) {
      setMessaggio({ testo: "Per favore, compila tutti i campi richiesti.", tipo: 'error' });
      setLoading(false);
      return;
    }

    const payload = {
      id_medico: medicoSelezionato.id_medico,
      data_visita: dataVisita,
      ora_visita: oraVisita,
      motivo_visita: motivo
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/prenotazioni?id_paziente=${idPaziente}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setMessaggio({ testo: 'Prenotazione confermata con successo!', tipo: 'success' });
        // Reset dei campi testuali
        setDataVisita('');
        setOraVisita('');
        setMotivo('');
        
        setTimeout(() => {
          setMessaggio({ testo: '', tipo: '' });
          onPrenotazione(); // Invoca la callback per aggiornare la Dashboard
        }, 2000);
      } else {
        const errData = await response.json();
        setMessaggio({ testo: `Errore: ${errData.detail}`, tipo: 'error' });
      }
    } catch (error) {
      console.error(error);
      setMessaggio({ testo: 'Errore di rete. Impossibile comunicare con il server.', tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Se l'utente non ha ancora cliccato nessuna scheda medico nella Dashboard, mostriamo un avviso elegante.
  if (!medicoSelezionato) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', border: '1px dashed rgba(147, 196, 125, 0.4)' }}>
        <i className="fa-solid fa-hand-pointer" style={{ fontSize: '2rem', color: '#a1a1aa', marginBottom: '15px' }}></i>
        <h3 style={{ margin: '0 0 10px 0', color: '#e5e5e7' }}>Nessuno specialista selezionato</h3>
        <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.95rem' }}>
          Per procedere con la prenotazione, seleziona una scheda medico dalla sezione qui sopra.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <i className="fa-solid fa-calendar-check" style={{ fontSize: '1.5rem', color: '#93c47d' }}></i>
        <h2 className="section-title" style={{ margin: 0 }}>Dettagli Prenotazione</h2>
      </div>

      <div style={{ background: 'rgba(147, 196, 125, 0.1)', border: '1px solid rgba(147, 196, 125, 0.3)', padding: '15px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
         <i className="fa-solid fa-stethoscope" style={{ fontSize: '1.5rem', color: '#93c47d' }}></i>
         <div>
           <p style={{ margin: '0 0 3px 0', color: '#e5e5e7', fontSize: '0.9rem' }}>Stai prenotando con:</p>
           <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>Dr. {medicoSelezionato.nome} {medicoSelezionato.cognome}</h3>
           <span style={{ color: '#93c47d', fontSize: '0.85rem', fontWeight: 'bold' }}>{medicoSelezionato.specializzazione}</span>
         </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* GRIGLIA A DUE COLONNE PER DATA E MOTIVO */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label>Scegli la Data</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <i className="fa-solid fa-calendar-days" style={{ position: 'absolute', left: '12px', color: '#93c47d', zIndex: 10 }}></i>
              <input 
                type="date" 
                value={dataVisita} 
                min={oggi}
                onChange={(e) => setDataVisita(e.target.value)} 
                required 
                className="form-control" 
                style={{ paddingLeft: '40px', position: 'relative', zIndex: 5, colorScheme: 'dark' }} 
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Motivo della Visita (Sintomi o tipo di controllo)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <i className="fa-solid fa-notes-medical" style={{ position: 'absolute', left: '12px', color: '#93c47d', zIndex: 10 }}></i>
              <input 
                type="text" 
                value={motivo} 
                onChange={(e) => setMotivo(e.target.value)} 
                required 
                placeholder="Es. Visita di controllo, dolore persistente..."
                className="form-control" 
                style={{ paddingLeft: '40px', position: 'relative', zIndex: 5 }} 
              />
            </div>
          </div>
          
        </div>

        {/* GRIGLIA ORARI (COMPARE SOLO SE UNA DATA E' SELEZIONATA) */}
        {dataVisita && (
          <div className="form-group" style={{ margin: 0 }}>
            <label>Seleziona l'Orario</label>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '15px', color: '#a1a1aa' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Controllo agende in corso...
              </div>
            ) : (
              <div className="grid-slots">
                {orariDisponibili.map(orario => {
                  const isOccupied = orariOccupati.includes(orario);
                  const isSelected = oraVisita === orario;
                  
                  return (
                    <button
                      key={orario}
                      type="button"
                      disabled={isOccupied}
                      className={`slot-button ${isSelected ? 'selected' : ''} ${isOccupied ? 'occupied' : ''}`}
                      onClick={() => setOraVisita(orario)}
                    >
                      {orario}
                      {isOccupied && <span className="slot-badge">Occupato</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PULSANTE SUBMIT */}
        <button 
          type="submit" 
          className="btn-submit" 
          disabled={loading || !dataVisita || !oraVisita || !motivo}
          style={{ 
            marginTop: '10px', 
            width: '100%',
            opacity: (!dataVisita || !oraVisita || !motivo) ? 0.5 : 1,
            cursor: (!dataVisita || !oraVisita || !motivo) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Elaborazione in corso...' : 'Conferma Prenotazione'}
        </button>

      </form>

      {/* MESSAGGIO DI STATO */}
      {messaggio.testo && (
        <div className={`status-message ${messaggio.tipo}`}>
          <i className={messaggio.tipo === 'success' ? "fa-solid fa-circle-check" : "fa-solid fa-circle-exclamation"} style={{ marginRight: '8px' }}></i>
          {messaggio.testo}
        </div>
      )}
    </div>
  );
}

export default PrenotazioneForm;