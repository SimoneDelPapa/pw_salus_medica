import { useState, useEffect } from 'react';

function Dashboard({ utente }) {
  const [statsMedico, setStatsMedico] = useState({ fatturato: 0, numero_referti: 0, numero_pazienti: 0 });
  const [listaReferti, setListaReferti] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (utente.ruolo === 'Medico') {
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
      fetch(`${import.meta.env.VITE_API_URL}/api/referti/${utente.id}`)
        .then(res => res.json())
        .then(data => {
          setListaReferti(data);
          setLoading(false);
        })
        .catch(err => console.error(err));
    }
  }, [utente]);

  const scaricaReferto = (referto) => {
    const contenutoFile = `CLINICA SALUS MEDICA\nDocumento Ufficiale\n------------------------\nID Referto: ${referto.id_referto}\nData: ${referto.data_referto}\n\n${referto.contenuto}\n------------------------\nFirma Elettronica: Valida`;
    const blob = new Blob([contenutoFile], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Referto_${referto.data_referto}_ID${referto.id_referto}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); 
  };

  if (loading) return <p style={{ textAlign: 'center', color: '#93c47d' }}>Caricamento area personale...</p>;

  const ListaRefertiUI = () => (
    <div style={{ marginTop: '30px' }}>
      <h3 style={{ color: '#e5e5e7', borderBottom: '1px solid rgba(147, 196, 125, 0.2)', paddingBottom: '10px' }}>
        📄 Referti e Documenti Clinici
      </h3>
      {listaReferti.length === 0 ? (
        <p style={{ color: '#a1a1aa' }}>Nessun documento disponibile.</p>
      ) : (
        <ul className="list-container">
          {listaReferti.map(referto => (
            <li key={referto.id_referto} className="list-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1.1rem', color: '#e5e5e7' }}>Visita del {referto.data_referto}</strong>
                <p style={{ margin: '5px 0 0 0', color: '#a1a1aa', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                  {referto.contenuto.substring(0, 60)}...
                </p>
              </div>
              <button 
                onClick={() => scaricaReferto(referto)} 
                className="btn-submit" 
                style={{ width: 'auto', margin: 0, padding: '10px 20px' }}
              >
                ⬇️ Scarica File
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (utente.ruolo === 'Medico') {
    return (
      <>
        <div className="card">
          <h2>📊 Dashboard Operativa</h2>
          <div className="stats-container" style={{ marginTop: '20px' }}>
            <div className="stat-card">
              <h3>Fatturato</h3>
              <p style={{ color: '#93c47d', fontSize: '1.5rem', fontWeight: 'bold' }}>€ {statsMedico.fatturato.toFixed(2)}</p>
            </div>
            <div className="stat-card">
              <h3>Referti</h3>
              <p style={{ color: '#93c47d', fontSize: '1.5rem', fontWeight: 'bold' }}>{statsMedico.numero_referti}</p>
            </div>
            <div className="stat-card">
              <h3>Pazienti</h3>
              <p style={{ color: '#93c47d', fontSize: '1.5rem', fontWeight: 'bold' }}>{statsMedico.numero_pazienti}</p>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <h2>💳 Storico Transazioni</h2>
          {(!statsMedico.transazioni || statsMedico.transazioni.length === 0) ? (
            <p style={{ color: '#a1a1aa' }}>Nessuna transazione registrata finora.</p>
          ) : (
            <ul className="list-container">
              {statsMedico.transazioni.map(transazione => (
                <li key={transazione.id_fattura} className="list-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ display: 'block', color: '#e5e5e7' }}>
                      Fattura n° {transazione.id_fattura}
                    </strong>
                    <span style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>
                      Rif. Prenotazione ID: {transazione.id_prenotazione} • Data: {transazione.data_emissione}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#93c47d' }}>
                    + € {transazione.importo.toFixed(2)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <ListaRefertiUI />
      </>
    );
  }

  return (
    <div className="card">
      <h2>Area Personale Paziente</h2>
      <ListaRefertiUI />
    </div>
  );
}

export default Dashboard;