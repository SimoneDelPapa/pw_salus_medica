import { useState, useEffect } from 'react';

function Dashboard({ utente }) {
  const [statsMedico, setStatsMedico] = useState({ fatturato: 0, numero_referti: 0, numero_pazienti: 0 });
  const [listaReferti, setListaReferti] = useState([]); // Ora lo usiamo sia per medico che per paziente
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (utente.ruolo === 'Medico') {
      // Il Medico scarica sia le statistiche che i suoi referti
      Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/medico/${utente.id}`).then(res => res.json()),
        fetch(`${import.meta.env.VITE_API_URL}/api/referti/medico/${utente.id}`).then(res => res.json())
      ]).then(([stats, referti]) => {
        setStatsMedico(stats);
        setListaReferti(referti);
        setLoading(false);
      }).catch(err => console.error(err));
    } 
    else if (utente.ruolo === 'Paziente') {
      // Il Paziente scarica solo i referti
      fetch(`${import.meta.env.VITE_API_URL}/api/referti/${utente.id}`)
        .then(res => res.json())
        .then(data => {
          setListaReferti(data);
          setLoading(false);
        })
        .catch(err => console.error(err));
    }
  }, [utente]);

  // FUNZIONE MAGICA PER SCARICARE IL FILE .TXT
  const scaricaReferto = (referto) => {
    // Prepariamo il testo del file
    const contenutoFile = `CLINICA SALUS MEDICA\nDocumento Ufficiale\n------------------------\nID Referto: ${referto.id_referto}\nData: ${referto.data_referto}\n\n${referto.contenuto}\n------------------------\nFirma Elettronica: Valida`;
    
    // Creiamo un file Blob in memoria
    const blob = new Blob([contenutoFile], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Creiamo un link invisibile e lo "clicchiamo" via codice per far partire il download
    const link = document.createElement('a');
    link.href = url;
    link.download = `Referto_${referto.data_referto}_ID${referto.id_referto}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Puliamo la memoria
  };

  if (loading) return <p style={{ textAlign: 'center' }}>Caricamento area personale...</p>;

  // Componente riutilizzabile per la lista dei referti
  const ListaRefertiUI = () => (
    <div style={{ marginTop: '30px' }}>
      <h3 style={{ color: '#1d1d1f' }}>📄 Referti e Documenti Clinici</h3>
      {listaReferti.length === 0 ? (
        <p>Nessun documento disponibile.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {listaReferti.map(referto => (
            <li key={referto.id_referto} className="card" style={{ padding: '20px', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1.1rem' }}>Visita del {referto.data_referto}</strong>
                <p style={{ margin: '5px 0 0 0', color: '#515154', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                  {referto.contenuto.substring(0, 60)}...
                </p>
              </div>
              <button 
                onClick={() => scaricaReferto(referto)} 
                className="btn-submit" 
                style={{ width: 'auto', margin: 0, padding: '10px 20px', backgroundColor: '#34c759' }}
              >
                ⬇️ Scarica File
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  // INTERFACCIA MEDICO
  if (utente.ruolo === 'Medico') {
    return (
      <>
        <div className="card">
          <h2>📊 Dashboard Operativa</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginTop: '20px' }}>
            <div className="stat-card">
              <h3>Fatturato Generato</h3>
              <p style={{ color: '#0071e3' }}>€ {statsMedico.fatturato.toFixed(2)}</p>
            </div>
            <div className="stat-card">
              <h3>Referti Emessi</h3>
              <p style={{ color: '#34c759' }}>{statsMedico.numero_referti}</p>
            </div>
            <div className="stat-card">
              <h3>Pazienti Trattati</h3>
              <p style={{ color: '#ff9500' }}>{statsMedico.numero_pazienti}</p>
            </div>
          </div>
        </div>

        {/* NUOVA SEZIONE: Storico Transazioni per il Medico */}
        <div className="card" style={{ marginTop: '20px' }}>
          <h2>💳 Storico Transazioni</h2>
          {(!statsMedico.transazioni || statsMedico.transazioni.length === 0) ? (
            <p>Nessuna transazione registrata finora.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {statsMedico.transazioni.map(transazione => (
                <li key={transazione.id_fattura} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '15px', borderBottom: '1px solid rgba(0,0,0,0.1)' 
                }}>
                  <div>
                    <strong style={{ display: 'block', color: '#1d1d1f' }}>
                      Fattura n° {transazione.id_fattura}
                    </strong>
                    <span style={{ fontSize: '0.9rem', color: '#86868b' }}>
                      Rif. Prenotazione ID: {transazione.id_prenotazione} • Data: {transazione.data_emissione}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0071e3' }}>
                    + € {transazione.importo.toFixed(2)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Mostriamo anche la lista dei referti emessi */}
        <ListaRefertiUI />
      </>
    );
  }

  // INTERFACCIA PAZIENTE
  return (
    <div className="card">
      <h2>Area Personale Paziente</h2>
      <ListaRefertiUI />
    </div>
  );
}

export default Dashboard;