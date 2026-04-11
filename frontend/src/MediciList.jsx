import { useState, useEffect } from 'react';

function MediciList() {
  const [medici, setMedici] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [specAperta, setSpecAperta] = useState(null);
  const [errore, setErrore] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/medici`)
      .then(res => {
        if (!res.ok) throw new Error("Endpoint non trovato");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setMedici(data);
        } else {
          setMedici([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Errore caricamento medici:", err);
        setErrore(true);
        setLoading(false);
        setMedici([]); 
      });
  }, []);

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
    <div className="glass-card" style={{ textAlign: 'center', padding: '20px' }}>
      <p style={{ color: '#ff453a', fontWeight: 'bold' }}>Impossibile connettersi al server.</p>
      <small style={{ color: '#a1a1aa' }}>Verifica che il backend Python sia attivo.</small>
    </div>
  );

  return (
    <div className="glass-card">
      <h2 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '600' }}>Specialisti per Branca Medica</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Object.keys(categorie).length === 0 ? (
          <p style={{ color: '#a1a1aa', textAlign: 'center' }}>Nessun medico disponibile.</p>
        ) : (
          Object.keys(categorie).sort().map(spec => (
            <div key={spec} style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* HEADER FISARMONICA IN STILE GLASS */}
              <div 
                onClick={() => setSpecAperta(specAperta === spec ? null : spec)}
                className="glass-panel glass-panel-hoverable"
                style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px 20px',
                  marginBottom: specAperta === spec ? '0' : '0', 
                  borderBottomLeftRadius: specAperta === spec ? '0' : '16px',
                  borderBottomRightRadius: specAperta === spec ? '0' : '16px',
                  background: specAperta === spec ? 'rgba(255,255,255,0.08)' : ''
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

              {/* CONTENUTO FISARMONICA (Sfondo ancora più scuro e sfocato) */}
              {specAperta === spec && (
                <div style={{ 
                  padding: '15px', 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
                  gap: '10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderTop: 'none',
                  borderBottomLeftRadius: '16px',
                  borderBottomRightRadius: '16px'
                }}>
                  {categorie[spec].map(m => {
                    const iniziali = `${m.nome?.charAt(0) || ''}${m.cognome?.charAt(0) || ''}`.toUpperCase();
                    return (
                      <div key={m.id_medico} className="glass-panel" style={{ display: 'flex', alignItems: 'center', padding: '12px 15px' }}>
                        <div style={{ 
                          width: '42px', height: '42px', borderRadius: '50%', 
                          backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#93c47d', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontWeight: 'bold', fontSize: '0.9rem', marginRight: '15px', flexShrink: 0 
                        }}>
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