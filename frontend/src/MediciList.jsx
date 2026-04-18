import { useState, useEffect } from 'react';

function MediciList() {
  const [medici, setMedici] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/medici`)
      .then((res) => {
        if (!res.ok) throw new Error('Errore nel caricamento dei medici');
        return res.json();
      })
      .then((data) => {
        setMedici(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setErrore('Impossibile caricare la lista dei medici.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '20px' }}>Caricamento medici in corso...</div>;
  }

  if (errore) {
    return <div style={{ textAlign: 'center', color: '#ff453a', padding: '20px' }}>{errore}</div>;
  }

  if (medici.length === 0) {
    return <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '20px' }}>Nessun medico specialista registrato al momento.</div>;
  }

  // ==============================================================
  // LOGICA DI RAGGRUPPAMENTO E ORDINAMENTO ALFABETICO
  // ==============================================================
  
  // 1. Raggruppiamo i medici per specializzazione
  const mediciRaggruppati = medici.reduce((acc, medico) => {
    const specializzazione = medico.specializzazione || 'Altro';
    if (!acc[specializzazione]) {
      acc[specializzazione] = [];
    }
    acc[specializzazione].push(medico);
    return acc;
  }, {});

  // 2. Ordiniamo i medici in ordine alfabetico (Cognome, poi Nome) dentro ogni gruppo
  Object.keys(mediciRaggruppati).forEach(specializzazione => {
    mediciRaggruppati[specializzazione].sort((a, b) => {
      const nomeA = `${a.cognome} ${a.nome}`.toLowerCase();
      const nomeB = `${b.cognome} ${b.nome}`.toLowerCase();
      return nomeA.localeCompare(nomeB);
    });
  });

  // 3. Estraiamo e ordiniamo in ordine alfabetico le specializzazioni (le categorie)
  const specializzazioniOrdinate = Object.keys(mediciRaggruppati).sort();

  return (
    <div style={{ marginTop: '20px' }}>
      <h2 style={{ color: '#93c47d', marginBottom: '30px', fontSize: '1.8rem', fontWeight: '800', textAlign: 'center' }}>
        I Nostri Specialisti
      </h2>
      
      {/* Mappiamo le specializzazioni ordinate */}
      {specializzazioniOrdinate.map(specializzazione => (
        <div key={specializzazione} style={{ marginBottom: '40px' }}>
          
          {/* Intestazione della Branca Medica */}
          <div style={{ 
            borderBottom: '2px solid rgba(147, 196, 125, 0.3)', 
            marginBottom: '20px', 
            paddingBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '1.5rem' }}>🩺</span>
            <h3 style={{ margin: 0, color: '#e5e5e7', fontSize: '1.3rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {specializzazione}
            </h3>
          </div>

          {/* Griglia dei medici appartenenti a questa branca */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '20px' 
          }}>
            {mediciRaggruppati[specializzazione].map((medico) => {
              // Logica del prefisso in base al sesso
              const prefisso = medico.sesso === 'F' ? 'Dott.ssa' : 'Dott.';

              return (
                <div 
                  key={medico.id_medico} 
                  className="glass-card" 
                  style={{ 
                    padding: '20px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '10px',
                    borderLeft: '4px solid #93c47d' // Tocco di design per far risaltare le card
                  }}
                >
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color: '#fff' }}>
                      {prefisso} {medico.cognome} {medico.nome}
                    </h3>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.05)', margin: '5px 0' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#a1a1aa' }}>
                    {medico.telefono ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📞</span> {medico.telefono}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5 }}>
                        <span>📞</span> Nessun recapito fornito
                      </div>
                    )}
                    
                    {medico.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>✉️</span> {medico.email}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
        </div>
      ))}
    </div>
  );
}

export default MediciList;