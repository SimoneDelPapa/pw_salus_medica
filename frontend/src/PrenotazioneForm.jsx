import { useState } from 'react';

function PrenotazioneForm({ idPaziente }) {
  const [formData, setFormData] = useState({
    id_paziente: idPaziente,
    id_medico: '',
    data_visita: '',
    ora_visita: '',
    motivo_visita: ''
  });

  const [messaggio, setMessaggio] = useState('');

  // 1. CALCOLIAMO LA DATA DI OGGI (Formato YYYY-MM-DD)
  // toISOString() restituisce "2026-03-09T..." e split('T')[0] prende solo la prima parte!
  const oggi = new Date().toISOString().split('T')[0];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessaggio('Invio in corso...');

    const bodyData = {
      id_medico: parseInt(formData.id_medico),
      data_visita: formData.data_visita,
      ora_visita: formData.ora_visita + ":00", 
      motivo_visita: formData.motivo_visita
    };

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/prenotazioni?id_paziente=${formData.id_paziente}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
      });

      if (response.ok) {
        setMessaggio('✅ Prenotazione confermata con successo!');
        setFormData({ ...formData, id_medico: '', data_visita: '', ora_visita: '', motivo_visita: '' });
      } else {
        const errorData = await response.json();
        setMessaggio(`❌ Errore: ${errorData.detail}`);
      }
    } catch (error) {
      console.error("Errore di rete:", error);
      setMessaggio('❌ Errore di connessione col server.');
    }
  };

  return (
    <div className="card">
      <h2>Prenota una Visita</h2>
      
      <form onSubmit={handleSubmit}>
        
        <div className="form-group">
          <label>ID Medico Specialista:</label>
          <input type="number" name="id_medico" value={formData.id_medico} onChange={handleChange} required className="form-control" placeholder="Inserisci l'ID del medico..." />
        </div>

        <div className="form-group">
          <label>Data della visita:</label>
          {/* 2. AGGIUNGIAMO L'ATTRIBUTO min={oggi} AL CAMPO DATA */}
          <input 
            type="date" 
            name="data_visita" 
            value={formData.data_visita} 
            onChange={handleChange} 
            required 
            className="form-control" 
            min={oggi} 
          />
        </div>

        <div className="form-group">
          <label>Ora della visita:</label>
          <input type="time" name="ora_visita" value={formData.ora_visita} onChange={handleChange} required className="form-control" />
        </div>

        <div className="form-group">
          <label>Motivo della visita:</label>
          <textarea name="motivo_visita" value={formData.motivo_visita} onChange={handleChange} rows="3" className="form-control" placeholder="Descrivi brevemente i tuoi sintomi o il motivo del controllo..."></textarea>
        </div>

        <button type="submit" className="btn-submit">
          Conferma Prenotazione
        </button>

      </form>

      {messaggio && (
        <div className={messaggio.includes('✅') ? 'alert-success' : 'alert-error'} style={{ marginTop: '15px' }}>
          {messaggio}
        </div>
      )}
    </div>
  );
}

export default PrenotazioneForm;