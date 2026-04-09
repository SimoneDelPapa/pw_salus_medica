import { useState, useEffect } from 'react';

function PrenotazioneForm({ idPaziente }) {
  const [medici, setMedici] = useState([]); 
  const [specializzazioni, setSpecializzazioni] = useState([]);
  const [specializzazioneScelta, setSpecializzazioneScelta] = useState('');
  const [mediciFiltrati, setMediciFiltrati] = useState([]);
  
  const [formData, setFormData] = useState({
    id_medico: '',
    data_visita: '',
    orario_visita: '',
    motivo: '' 
  });
  const [messaggio, setMessaggio] = useState('');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/medici`)
      .then(res => res.json())
      .then(data => {
        setMedici(data);
        const uniche = [...new Set(data.map(m => m.specializzazione))];
        setSpecializzazioni(uniche);
      })
      .catch(err => console.error("Errore caricamento medici:", err));
  }, []);

  useEffect(() => {
    if (specializzazioneScelta) {
      const filtrati = medici.filter(m => m.specializzazione === specializzazioneScelta);
      setMediciFiltrati(filtrati);
    } else {
      setMediciFiltrati([]);
    }
  }, [specializzazioneScelta, medici]);

  const handleAnnulla = () => {
    setSpecializzazioneScelta('');
    setFormData({ id_medico: '', data_visita: '', orario_visita: '', motivo: '' });
    setMessaggio('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessaggio('Invio in corso...');

    const id_p = Number(idPaziente);
    const id_m = Number(formData.id_medico);

    if (!id_p || !id_m) {
      setMessaggio("Errore: Dati utente o medico mancanti.");
      return;
    }

    // Costruiamo il body esattamente come definito in schemas.PrenotazioneCreate
    const bodyPrenotazione = {
      id_medico: id_m,
      data_visita: formData.data_visita,     // Nome esatto in schemas.py
      ora_visita: formData.orario_visita,    // Nome esatto in schemas.py (nel form lo salviamo in orario_visita)
      motivo_visita: formData.motivo,        // Nome esatto in schemas.py
      stato: "In attesa"
    };

    try {
      // NOTA: Aggiungiamo ?id_paziente= all'URL perché il tuo backend lo vuole lì!
      const url = `${import.meta.env.VITE_API_URL}/api/prenotazioni?id_paziente=${id_p}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPrenotazione),
      });

      if (response.ok) {
        setMessaggio('Prenotazione effettuata con successo!');
        setTimeout(() => {
          handleAnnulla();
          window.location.reload();
        }, 1500);
      } else {
        const errorData = await response.json();
        // Se c'è ancora un errore, lo leggiamo nel dettaglio
        const dettaglio = Array.isArray(errorData.detail) ? errorData.detail[0].msg : errorData.detail;
        setMessaggio(`Errore: ${dettaglio}`);
      }
    } catch (error) {
      setMessaggio('Errore di connessione al server.');
    }
  };

  return (
    <div className="card">
      <h2 style={{ color: '#93c47d', textAlign: 'center', marginBottom: '20px' }}>Prenota una Visita</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label>Specializzazione:</label>
            <select className="form-control" value={specializzazioneScelta} onChange={(e) => setSpecializzazioneScelta(e.target.value)} required>
              <option value="">-- Seleziona --</option>
              {specializzazioni.map(spec => <option key={spec} value={spec}>{spec}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Medico:</label>
            <select className="form-control" value={formData.id_medico} onChange={(e) => setFormData({ ...formData, id_medico: e.target.value })} required disabled={!specializzazioneScelta}>
              <option value="">-- Seleziona --</option>
              {mediciFiltrati.map(m => <option key={m.id_medico} value={m.id_medico}>Dr. {m.nome} {m.cognome}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label>Data:</label>
            <input type="date" className="form-control" value={formData.data_visita} min={new Date().toISOString().split('T')[0]} onChange={(e) => setFormData({ ...formData, data_visita: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Orario:</label>
            <input type="time" className="form-control" value={formData.orario_visita} onChange={(e) => setFormData({ ...formData, orario_visita: e.target.value })} required />
          </div>
        </div>
        <div className="form-group">
          <label>Motivo della Visita:</label>
          <textarea className="form-control" rows="3" value={formData.motivo} onChange={(e) => setFormData({ ...formData, motivo: e.target.value })} required />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" className="btn-submit" style={{ flex: 2, margin: 0 }}>Conferma</button>
          <button type="button" onClick={handleAnnulla} className="btn-submit" style={{ flex: 1, margin: 0, backgroundColor: '#3a3a3c' }}>Annulla</button>
        </div>
        {messaggio && <p style={{ textAlign: 'center', color: messaggio.includes('successo') ? '#93c47d' : '#ff453a', fontWeight: 'bold' }}>{messaggio}</p>}
      </form>
    </div>
  );
}

export default PrenotazioneForm;