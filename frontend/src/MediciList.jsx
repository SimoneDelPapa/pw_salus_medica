import { useState, useEffect } from 'react';

function MediciList() {
  const [medici, setMedici] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/medici`)
      .then(response => response.json())
      .then(data => {
        setMedici(data); 
        setLoading(false);
      })
      .catch(error => {
        console.error("Errore nel caricamento dei medici:", error);
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={{textAlign: 'center', color: '#93c47d'}}>Caricamento medici in corso...</p>;

  return (
    <div className="card">
      <h2>I Nostri Specialisti</h2>
      {medici.length === 0 ? (
        <p style={{ color: '#a1a1aa' }}>Nessun medico presente nel database.</p>
      ) : (
        <ul className="list-container">
          {medici.map(medico => (
            <li key={medico.id_medico} className="list-item">
              <h4 style={{ margin: '0 0 5px 0', color: '#93c47d', fontSize: '1.2rem' }}>Dott. {medico.nome} {medico.cognome}</h4>
              <span style={{ color: '#e5e5e7', display: 'block', marginBottom: '5px' }}>
                🩺 {medico.specializzazione}
              </span>
              <span style={{fontSize: '0.8rem', color: '#a1a1aa', marginTop: '5px'}}>
                ID Prenotazione: {medico.id_medico}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MediciList;