import { useState, useEffect } from 'react';

/**
 * Componente autonomo per la gestione delle prenotazioni.
 * Si occupa di recuperare la lista dei medici disponibili, mostrare un'interfaccia 
 * a card per la selezione e validare i dati di data e ora richiesti.
 * * @param {Object} props
 * @param {number} props.idPaziente - L'ID del paziente che sta effettuando la prenotazione
 * @param {Function} props.onPrenotazione - Callback invocata al successo per aggiornare la Dashboard
 */
function PrenotazioneForm({ idPaziente, onPrenotazione }) {
  // Stati per la selezione del medico
  const [listaMedici, setListaMedici] = useState([]);
  const [medicoSelezionato, setMedicoSelezionato] = useState(null);
  const [caricamentoMedici, setCaricamentoMedici] = useState(true);

  // Stati per i dettagli della prenotazione
  const [dataVisita, setDataVisita] = useState('');
  const [oraVisita, setOraVisita] = useState('');
  const [motivo, setMotivo] = useState('');
  
  const [orariOccupati, setOrariOccupati] = useState([]);
  const [loadingForm, setLoadingForm] = useState(false);
  const [messaggio, setMessaggio] = useState({ testo: '', tipo: '' });

  // Orari standard lavorativi
  const orariDisponibili = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
  ];

  const oggi = new Date().toISOString().split('T')[0];

  // 1. Fetch iniziale della lista medici
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/medici`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setListaMedici(data);
      })
      .catch(err => console.error("Errore recupero medici:", err))
      .finally(() => setCaricamentoMedici(false));
  }, []);

  // 2. Controllo agende quando data e medico sono selezionati
  useEffect(() => {
    if (!medicoSelezionato || !dataVisita) {
      setOrariOccupati([]);
      setOraVisita('');
      return;
    }

    setLoadingForm(true);
    fetch(`${import.meta.env.VITE_API_URL}/api/medico/${medicoSelezionato.id_medico}/orari-occupati?data=${dataVisita}`)
      .then(res => res.json())
      .then(data => {
        setOrariOccupati(data.occupati || []);
        if (data.occupati?.includes(oraVisita)) setOraVisita('');
      })
      .catch(err => {
        console.error("Errore fetch orari:", err);
        setOrariOccupati([]);
      })
      .finally(() => setLoadingForm(false));
  }, [medicoSelezionato, dataVisita]); 

  // Inoltro della richiesta di prenotazione
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessaggio({ testo: 'Elaborazione in corso...', tipo: 'info' });
    setLoadingForm(true);

    if (!medicoSelezionato || !dataVisita || !oraVisita || !motivo) {
      setMessaggio({ testo: "Per favore, compila tutti i campi richiesti.", tipo: 'error' });
      setLoadingForm(false);
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
        setDataVisita('');
        setOraVisita('');
        setMotivo('');
        setMedicoSelezionato(null); // Resetta la visualizzazione alla lista medici
        
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
      setLoadingForm(false);
    }
  };

  const gestisciAnnullaSelezione = () => {
    setMedicoSelezionato(null);
    setDataVisita('');
    setOraVisita('');
    setMotivo('');
    setMessaggio({ testo: '', tipo: '' });
  };

  return (
    <div className="glass-card" id="sezione-prenotazione">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <i className="fa-solid fa-calendar-plus" style={{ fontSize: '1.5rem', color: '#93c47d' }}></i>
        <h2 className="section-title" style={{ margin: 0 }}>Nuova Prenotazione</h2>
      </div>

      {/* FASE 1: MOSTRA LE CARD DEI MEDICI SE NESSUNO E' SELEZIONATO */}
      {!medicoSelezionato ? (
        <>
          <p style={{ color: '#a1a1aa', fontSize: '0.95rem', marginBottom: '20px' }}>
            Seleziona uno dei nostri specialisti per visualizzarne l'agenda e prenotare una visita.
          </p>
          
          {caricamentoMedici ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#a1a1aa' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Caricamento specialisti...
            </div>
          ) : listaMedici.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#ff453a' }}>
              Nessun medico attualmente disponibile.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              {listaMedici.map(m => (
                <div 
                  key={m.id_medico}
                  onClick={() => setMedicoSelezionato(m)}
                  className="glass-panel glass-panel-hoverable"
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    padding: '20px 15px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(147, 196, 125, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                    <i className="fa-solid fa-user-doctor" style={{ fontSize: '1.4rem', color: 'var(--salus-green)' }}></i>
                  </div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1.05rem', color: '#fff' }}>Dr. {m.nome} {m.cognome}</h3>
                  <span style={{ background: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '15px', fontSize: '0.75rem', color: '#93c47d', fontWeight: 'bold' }}>
                    {m.specializzazione || 'Specialista'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* FASE 2: MOSTRA IL FORM SE UN MEDICO E' STATO CLICCATO */
        <>
          <div style={{ background: 'rgba(147, 196, 125, 0.1)', border: '1px solid rgba(147, 196, 125, 0.3)', padding: '15px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
               <i className="fa-solid fa-stethoscope" style={{ fontSize: '1.5rem', color: '#93c47d' }}></i>
               <div>
                 <p style={{ margin: '0 0 3px 0', color: '#e5e5e7', fontSize: '0.9rem' }}>Stai prenotando con:</p>
                 <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>Dr. {medicoSelezionato.nome} {medicoSelezionato.cognome}</h3>
                 <span style={{ color: '#93c47d', fontSize: '0.85rem', fontWeight: 'bold' }}>{medicoSelezionato.specializzazione}</span>
               </div>
             </div>
             
             {/* TASTO ANNULLA PRENOTAZIONE / CAMBIA MEDICO */}
             <button onClick={gestisciAnnullaSelezione} className="glass-button" style={{ background: 'rgba(255, 69, 58, 0.1)', borderColor: 'rgba(255, 69, 58, 0.3)', color: '#ff453a', fontSize: '0.8rem', padding: '6px 12px' }}>
               <i className="fa-solid fa-arrow-rotate-left" style={{ marginRight: '6px' }}></i> Cambia Medico
             </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
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
                <label>Motivo della Visita</label>
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

            {dataVisita && (
              <div className="form-group" style={{ margin: 0 }}>
                <label>Seleziona l'Orario</label>
                {loadingForm ? (
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

            <button 
              type="submit" 
              className="btn-submit" 
              disabled={loadingForm || !dataVisita || !oraVisita || !motivo}
              style={{ 
                marginTop: '10px', 
                width: '100%',
                opacity: (!dataVisita || !oraVisita || !motivo) ? 0.5 : 1,
                cursor: (!dataVisita || !oraVisita || !motivo) ? 'not-allowed' : 'pointer'
              }}
            >
              {loadingForm ? 'Elaborazione in corso...' : 'Conferma Prenotazione'}
            </button>

          </form>

          {messaggio.testo && (
            <div className={`status-message ${messaggio.tipo}`}>
              <i className={messaggio.tipo === 'success' ? "fa-solid fa-circle-check" : "fa-solid fa-circle-exclamation"} style={{ marginRight: '8px' }}></i>
              {messaggio.testo}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PrenotazioneForm;