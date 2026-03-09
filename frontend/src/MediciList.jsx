import { useState, useEffect } from 'react';

function MediciList() {
  // Stati per memorizzare i dati e il caricamento
  const [medici, setMedici] = useState([]);
  const [loading, setLoading] = useState(true);

  // useEffect viene eseguito appena la pagina si carica
  useEffect(() => {
    // Chiamata all'API back-end
    fetch(`${import.meta.env.VITE_API_URL}/api/medici`)
      .then(response => response.json())
      .then(data => {
        setMedici(data); // Salviamo i dati ricevuti dal database
        setLoading(false);
      })
      .catch(error => {
        console.error("Errore nel caricamento dei medici:", error);
        setLoading(false);
      });
  }, []);

  // Cosa mostrare mentre aspettiamo la risposta del server
if (loading) return <p style={{textAlign: 'center', color: '#64748b'}}>Caricamento medici in corso...</p>;

  return (
    <div className="card">
      <h2>I Nostri Specialisti</h2>
      {medici.length === 0 ? (
        <p>Nessun medico presente nel database.</p>
      ) : (
        <ul className="medico-list">
          {medici.map(medico => (
            <li key={medico.id_medico} className="medico-item">
              <span className="medico-name">Dott. {medico.nome} {medico.cognome}</span>
              <span className="medico-spec">🩺 {medico.specializzazione}</span>
              <span className="medico-spec" style={{fontSize: '0.8rem', marginTop: '10px'}}>ID Prenotazione: {medico.id_medico}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MediciList;