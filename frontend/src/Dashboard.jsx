import { useState, useEffect } from 'react';
import PrenotazioneForm from './PrenotazioneForm';
import { jsPDF } from "jspdf"; 

function Dashboard({ utente }) {
  const [statsMedico, setStatsMedico] = useState({ fatturato: 0, numero_referti: 0, numero_pazienti: 0 });
  const [listaPazienti, setListaPazienti] = useState([]);
  const [pazienteSelezionato, setPazienteSelezionato] = useState(null);
  const [dettagliPaziente, setDettagliPaziente] = useState([]);
  const [loading, setLoading] = useState(true);

  // FIX: Usiamo id_profilo come ID di riferimento per le chiamate API
  const userId = utente?.id_profilo || utente?.id ? Number(utente.id_profilo || utente.id) : null;

  useEffect(() => {
    if (!utente || !userId) return;

    if (utente.ruolo === 'Medico') {
      Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/medico/${userId}`).then(res => res.json()),
        fetch(`${import.meta.env.VITE_API_URL}/api/medico/${userId}/pazienti`).then(res => res.json())
      ]).then(([stats, pazienti]) => {
        setStatsMedico(stats);
        setListaPazienti(pazienti);
        setLoading(false);
      }).catch(err => console.error(err));
    } else {
        // Il Paziente carica i SUOI referti senza specificare il medico
        fetch(`${import.meta.env.VITE_API_URL}/api/medico/paziente/${userId}/dettagli`)
        .then(res => res.json())
        .then(data => {
          const datiUnici = Array.isArray(data) ? data.filter((v, i, a) => a.findIndex(t => t.id_prenotazione === v.id_prenotazione) === i) : [];
          setDettagliPaziente(datiUnici);
          setLoading(false);
        }).catch(err => console.error(err));
    }
  }, [utente, userId]);

  const scaricaReferto = (item, nomeCompleto) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const centerX = pageWidth / 2;
      const verdeSalus = [147, 196, 125];

      const nomeMedico = item.cognome_medico 
        ? `Dr. ${item.nome_medico} ${item.cognome_medico}` 
        : (utente.ruolo === 'Medico' ? `Dr. ${utente.nome} ${utente.cognome}` : "Dr. Specialista Salus Medica");

      // INTESTAZIONE TESTUALE
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(verdeSalus[0], verdeSalus[1], verdeSalus[2]);
      doc.text("Salus Medica", centerX, 25, { align: "center" });

      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("L'eccellenza medica a portata di click", centerX, 31, { align: "center" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(130);
      doc.text("Via della Salute, 123 - 00100 Roma (RM) | info@salus.it", centerX, 37, { align: "center" });

      doc.setDrawColor(verdeSalus[0], verdeSalus[1], verdeSalus[2]);
      doc.setLineWidth(0.5);
      doc.line(15, 45, pageWidth - 15, 45);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text("REFERTO MEDICO SPECIALISTICO", centerX, 60, { align: "center" });
      
      doc.setFontSize(11);
      doc.text(`Responsabile Clinico: ${nomeMedico}`, centerX, 68, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("DATI PAZIENTE", 15, 85);
      doc.setFont("helvetica", "normal");
      doc.text(`Nominativo: ${nomeCompleto}`, 15, 92);
      
      doc.setFont("helvetica", "bold");
      doc.text("DETTAGLI VISITA", 120, 85);
      doc.setFont("helvetica", "normal");
      doc.text(`Data Visita: ${item.data_visita}`, 120, 92);
      doc.text(`Ora Visita: ${item.ora_visita || 'N.D.'}`, 120, 98);

      doc.line(15, 105, pageWidth - 15, 105);

      doc.setFont("helvetica", "bold");
      doc.text("QUESITO DIAGNOSTICO:", 15, 115);
      doc.setFont("helvetica", "normal");
      const motivo = doc.splitTextToSize(item.motivo || "Controllo di routine", pageWidth - 30);
      doc.text(motivo, 15, 122);

      doc.setFont("helvetica", "bold");
      doc.text("VALUTAZIONE E ESAME OBIETTIVO:", 15, 145);
      doc.setFont("helvetica", "normal");
      const contenuto = doc.splitTextToSize(item.contenuto || "Paziente in buone condizioni generali. Parametri vitali nella norma.", pageWidth - 30);
      doc.text(contenuto, 15, 152);

      doc.setFont("helvetica", "bold");
      doc.text(`Importo totale: € ${item.importo ? Number(item.importo).toFixed(2) : "0.00"}`, 15, 240);

      doc.setFont("helvetica", "normal");
      doc.text("Firma del Medico", pageWidth - 60, 255);
      doc.text(nomeMedico, pageWidth - 60, 262);
      doc.line(pageWidth - 65, 264, pageWidth - 15, 264);

      doc.setFontSize(8);
      doc.setTextColor(170);
      doc.text("Documento generato dal sistema Salus Medica - Firmato digitalmente", centerX, 285, { align: "center" });

      doc.save(`Referto_${item.data_visita}_Salus.pdf`);
    } catch (error) {
      console.error(error);
      alert("Errore nella generazione del referto.");
    }
  };

  if (loading) return <p style={{ textAlign: 'center', color: '#93c47d', marginTop: '50px' }}>Caricamento...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {utente.ruolo === 'Medico' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>Dashboard Medico</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              <div style={{ background: '#1c1c1e', padding: '10px', borderRadius: '8px', border: '1px solid #3a3a3c', textAlign: 'center' }}>
                <small style={{ color: '#a1a1aa' }}>Pazienti</small>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{statsMedico.numero_pazienti}</div>
              </div>
              <div style={{ background: '#1c1c1e', padding: '10px', borderRadius: '8px', border: '1px solid #3a3a3c', textAlign: 'center' }}>
                <small style={{ color: '#a1a1aa' }}>Referti</small>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{statsMedico.numero_referti}</div>
              </div>
              <div style={{ background: '#1c1c1e', padding: '10px', borderRadius: '8px', border: '1px solid #3a3a3c', textAlign: 'center' }}>
                <small style={{ color: '#a1a1aa' }}>Fatturato</small>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#93c47d' }}>€{statsMedico.fatturato.toFixed(2)}</div>
              </div>
            </div>
          </div>
          <div className="card">
             <h2 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>I Tuoi Pazienti</h2>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {listaPazienti.map(p => (
                  <div key={p.id_paziente} onClick={() => { 
                    setPazienteSelezionato(p); 
                    // FIX PRINCIPALE: Aggiunto ?id_medico=${userId} alla stringa di fetch
                    fetch(`${import.meta.env.VITE_API_URL}/api/medico/paziente/${p.id_paziente}/dettagli?id_medico=${userId}`)
                      .then(res => res.json())
                      .then(data => {
                        const unici = data.filter((v, i, a) => a.findIndex(t => t.id_prenotazione === v.id_prenotazione) === i);
                        setDettagliPaziente(unici);
                      });
                  }} style={{ padding: '10px', background: '#1c1c1e', border: '1px solid #3a3a3c', borderRadius: '8px', cursor: 'pointer', textAlign: 'center' }}>
                    {p.nome} {p.cognome}
                  </div>
                ))}
             </div>
          </div>
          {pazienteSelezionato && (
            <div className="card" style={{ borderTop: '4px solid #93c47d' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h2 style={{ fontSize: '1.1rem' }}>Storico: {pazienteSelezionato.nome} {pazienteSelezionato.cognome}</h2>
                <button onClick={() => setPazienteSelezionato(null)} style={{ background: '#3a3a3c', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Chiudi</button>
              </div>
              <ListaVisiteUI dati={dettagliPaziente} nomeUtente={`${pazienteSelezionato.nome} ${pazienteSelezionato.cognome}`} scaricaReferto={scaricaReferto} />
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PrenotazioneForm idPaziente={userId} />
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '15px' }}>Il Tuo Storico Visite</h2>
            <ListaVisiteUI dati={dettagliPaziente} nomeUtente={`${utente.nome} ${utente.cognome}`} scaricaReferto={scaricaReferto} />
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================
// LISTA VISITE - CONTROLLO RIGOROSO TEMPORALE
// ==============================================================
function ListaVisiteUI({ dati, nomeUtente, scaricaReferto }) {
  if (!dati.length) return <p style={{ textAlign: 'center', color: '#a1a1aa', fontSize: '0.8rem', padding: '10px' }}>Nessun dato in archivio.</p>;
  
  const adesso = new Date();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {dati.map(item => {
        // Logica temporale per il tasto
        const [y, m, d] = item.data_visita.split("-");
        const [h, min] = (item.ora_visita || "00:00").split(":");
        const dataVisita = new Date(y, m - 1, d, h, min);
        const scaricabile = adesso > dataVisita;
        
        return (
          <div key={item.id_prenotazione} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '10px 15px', 
            background: '#1c1c1e', 
            borderRadius: '8px', 
            alignItems: 'center', 
            border: '1px solid #2c2c2e' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
              <span style={{ color: '#93c47d', fontSize: '0.8rem', fontWeight: 'bold', width: '85px', flexShrink: 0 }}>
                {item.data_visita}
              </span>
              <span style={{ color: '#eee', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.motivo}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ color: '#a1a1aa', fontSize: '0.8rem', fontWeight: '500' }}>
                €{item.importo ? item.importo.toFixed(2) : '0.00'}
              </span>
              
              <button 
                disabled={!scaricabile} 
                onClick={() => scaricaReferto(item, nomeUtente)} 
                style={{ 
                  width: '85px',         
                  padding: '6px 0', 
                  fontSize: '0.65rem', 
                  borderRadius: '4px', 
                  border: 'none', 
                  textAlign: 'center',
                  background: scaricabile ? '#93c47d' : '#262626', 
                  color: scaricabile ? '#121212' : '#666',
                  cursor: scaricabile ? 'pointer' : 'default',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}>
                {scaricabile ? 'SCARICA' : 'ATTESA'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Dashboard;