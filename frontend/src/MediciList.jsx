import { useState, useEffect } from 'react';

function MediciList() {
  const [medici, setMedici] = useState([]); // Inizializzato come array vuoto
  const [loading, setLoading] = useState(true);
  const [specAperta, setSpecAperta] = useState(null);
  const [errore, setErrore] = useState(false);

  useEffect(() => {
    // Verifichiamo che l'URL sia corretto e il backend raggiungibile
    fetch(`${import.meta.env.VITE_API_URL}/api/medici`)
      .then(res => {
        if (!res.ok) throw new Error("Errore 404: Endpoint non trovato");
        return res.json();
      })
      .then(data => {
        // CI ASSICURIAMO CHE DATA SIA UN ARRAY
        if (Array.isArray(data)) {
          setMedici(data);
        } else {
          console.error("I dati ricevuti non sono un array:", data);
          setMedici([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Errore caricamento medici:", err);
        setErrore(true);
        setLoading(false);
        setMedici([]); // Evita il crash del .reduce
      });
  }, []);

  // PROTEZIONE: Se medici non è un array (es. errore server), il reduce non parte
  const categorie = Array.isArray(medici) ? medici.reduce((acc, m) => {
    const s = m.specializzazione || "Altro";
    if (!acc[s]) acc[s] = [];
    acc[s].push(m);
    return acc;
  }, {}) : {};

  const getTitolo = (nome) => {
    if (!nome) return "Dott.";
    const nomeLower = nome.trim().toLowerCase();
    const eccezioniMaschili = ['andrea', 'luca', 'mattia', 'nicola', 'enea', 'elia', 'tobia', 'battista', 'gionata', 'zaccaria'];
    if (eccezioniMaschili.includes(nomeLower)) return 'Dott.';
    return nomeLower.endsWith('a') ? 'Dott.ssa' : 'Dott.';
  };

  if (loading) return <p style={{ textAlign: 'center', color: '#93c47d', marginTop: '20px' }}>Caricamento specialisti...</p>;
  
  if (errore) return (
    <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
      <p style={{ color: '#ff453a' }}>Impossibile connettersi al server (Errore 404).</p>
      <small style={{ color: '#a1a1aa' }}>Verifica che il backend Python sia attivo su :8000</small>
    </div>
  );

  return (
    <div className="card">
      <h2 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Specialisti per Branca Medica</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {Object.keys(categorie).length === 0 ? (
          <p style={{ color: '#a1a1aa', textAlign: 'center' }}>Nessun medico disponibile.</p>
        ) : (
          Object.keys(categorie).sort().map(spec => (
            <div key={spec} style={{ border: '1px solid #3a3a3c', borderRadius: '8px', overflow: 'hidden' }}>
              <div 
                onClick={() => setSpecAperta(specAperta === spec ? null : spec)}
                style={{ 
                  padding: '15px 20px', 
                  backgroundColor: specAperta === spec ? '#2c2c2e' : '#1c1c1e',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background-color 0.2s'
                }}
              >
                <span style={{ fontSize: '1.05rem', fontWeight: 'bold', color: specAperta === spec ? '#93c47d' : '#e5e5e7' }}>
                  {spec}
                </span>
                <svg 
                  width="20" height="20" viewBox="0 0 24 24" fill="none" 
                  stroke={specAperta === spec ? '#93c47d' : '#a1a1aa'} 
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: specAperta === spec ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>

              {specAperta === spec && (
                <div style={{ 
                  padding: '15px', 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
                  gap: '10px',
                  backgroundColor: '#121212',
                  borderTop: '1px solid #3a3a3c'
                }}>
                  {categorie[spec].map(m => {
                    const iniziali = `${m.nome?.charAt(0) || ''}${m.cognome?.charAt(0) || ''}`.toUpperCase();
                    return (
                      <div key={m.id_medico} style={{ display: 'flex', alignItems: 'center', padding: '12px 15px', backgroundColor: '#1c1c1e', border: '1px solid #3a3a3c', borderRadius: '8px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#2c2c2e', color: '#93c47d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', marginRight: '15px', flexShrink: 0 }}>
                          {iniziali}
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '1rem', color: '#ffffff' }}>
                            {getTitolo(m.nome)} {m.nome} {m.cognome}
                          </strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MediciList;