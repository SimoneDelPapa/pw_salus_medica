import { useState, useEffect } from 'react';

/**
 * Gestisce il modulo di prenotazione visite.
 * Implementa il filtraggio dinamico dei medici per specializzazione senza effetti collaterali.
 */
function PrenotazioneForm({ idPaziente }) {
  const [medici, setMedici] = useState([]); 
  const [specializzazioni, setSpecializzazioni] = useState([]);
  const [specializzazioneScelta, setSpecializzazioneScelta] = useState('');
  const [formData, setFormData] = useState({
    id_medico: '',
    data_visita: '',
    ora_visita: '',
    motivo: '' 
  });
  const [messaggio, setMessaggio] = useState({ testo: '', tipo: '' });

  // Caricamento anagrafica medici all'avvio
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/medici`)
      .then(res => res.json())
      .then(data => {
        setMedici(data);
        setSpecializzazioni([...new Set(data.map(m => m.specializzazione))]);
      })
      .catch(err => console.error("Anagrafica medici non raggiungibile:", err));
  }, []);

  // Derivazione stato: calcolo dei medici filtrati senza triggerare render aggiuntivi
  const mediciFiltrati = specializzazioneScelta 
    ? medici.filter(m => m.specializzazione === specializzazioneScelta)
    : [];

  const resetForm = () => {
    setSpecializzazioneScelta('');
    setFormData({ id_medico: '', data_visita: '', ora_visita: '', motivo: '' });
    setMessaggio({ testo: '', tipo: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessaggio({ testo: 'Invio richiesta in corso...', tipo: 'info' });

    const payload = {
      id_medico: Number(formData.id_medico),
      data_visita: formData.data_visita,
      ora_visita: formData.ora_visita,
      motivo_visita: formData.motivo,
      stato: "In attesa"
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/prenotazioni?id_paziente=${idPaziente}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessaggio({ testo: 'Prenotazione confermata con successo.', tipo: 'success' });
        setTimeout(() => {
          resetForm();
          window.location.reload();
        }, 1500);
      } else {
        const error = await res.json();
        setMessaggio({ testo: `Errore: ${error.detail}`, tipo: 'error' });
      }
    } catch (err) {
      console.error("Network error:", err);
      setMessaggio({ testo: 'Connessione al server fallita.', tipo: 'error' });
    }
  };

  return (
    <div className="glass-card">
      <h2 style={{ marginBottom: '20px', fontWeight: '600' }}>Nuova Prenotazione</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label>Area Medica</label>
            <select className="form-control" value={specializzazioneScelta} onChange={(e) => setSpecializzazioneScelta(e.target.value)} required>
              <option value="">Seleziona branca...</option>
              {specializzazioni.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Specialista</label>
            <select className="form-control" value={formData.id_medico} onChange={(e) => setFormData({ ...formData, id_medico: e.target.value })} required disabled={!specializzazioneScelta}>
              <option value="">Seleziona medico...</option>
              {mediciFiltrati.map(m => <option key={m.id_medico} value={m.id_medico}>Dr. {m.nome} {m.cognome}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label>Data</label>
            <input type="date" className="form-control" value={formData.data_visita} min={new Date().toISOString().split('T')[0]} onChange={(e) => setFormData({ ...formData, data_visita: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Orario</label>
            <input type="time" className="form-control" value={formData.ora_visita} onChange={(e) => setFormData({ ...formData, ora_visita: e.target.value })} required />
          </div>
        </div>
        <div className="form-group">
          <label>Note / Motivo Visita</label>
          <textarea className="form-control" rows="3" value={formData.motivo} onChange={(e) => setFormData({ ...formData, motivo: e.target.value })} required />
        </div>
        <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
          <button type="submit" className="btn-submit" style={{ flex: 2, margin: 0 }}>Conferma</button>
          <button type="button" onClick={resetForm} className="btn-submit" style={{ flex: 1, margin: 0, backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>Annulla</button>
        </div>
        
        {messaggio.testo && (
          <p style={{ 
            textAlign: 'center', 
            fontWeight: 'bold', 
            marginTop: '10px',
            color: messaggio.tipo === 'success' ? '#93c47d' : (messaggio.tipo === 'info' ? '#a1a1aa' : '#ff453a')
          }}>
            {messaggio.testo}
          </p>
        )}
      </form>
    </div>
  );
}

export default PrenotazioneForm;