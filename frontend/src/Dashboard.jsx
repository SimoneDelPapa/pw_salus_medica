import { useState, useEffect } from 'react';
import PrenotazioneForm from './PrenotazioneForm';
import { jsPDF } from "jspdf"; 

function Dashboard({ utente }) {
  // Stati per il Medico
  const [statsMedico, setStatsMedico] = useState({ fatturato: 0, numero_referti: 0, numero_pazienti: 0 });
  const [listaPazienti, setListaPazienti] = useState([]);
  const [pazienteSelezionato, setPazienteSelezionato] = useState(null);
  
  // Stati per il Paziente
  const [dettagliPaziente, setDettagliPaziente] = useState([]);
  const [statsPaziente, setStatsPaziente] = useState({ fatture_pagate: 0, fatture_da_pagare: 0, referti_emessi: 0, referti_da_emettere: 0 });
  
  const [loading, setLoading] = useState(true);

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
        Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/medico/paziente/${userId}/dettagli`).then(res => res.json()),
          fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/paziente/${userId}`).then(res => res.json())
        ]).then(([dettagli, stats]) => {
          const datiUnici = Array.isArray(dettagli) ? dettagli.filter((v, i, a) => a.findIndex(t => t.id_prenotazione === v.id_prenotazione) === i) : [];
          setDettagliPaziente(datiUnici);
          if(stats && !stats.detail) {
            setStatsPaziente(stats);
          }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {utente.ruolo === 'Medico' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 1. DASHBOARD STATISTICHE MEDICO */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '15px', fontWeight: '600' }}>Dashboard Medico</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px' }}>
              
              <div className="glass-panel" style={{ textAlign: 'center' }}>
                <small style={{ color: '#a1a1aa', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Fatturato</small>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#93c47d', marginTop: '5px' }}>€{statsMedico.fatturato.toFixed(2)}</div>
              </div>
              
              <div className="glass-panel" style={{ textAlign: 'center' }}>
                <small style={{ color: '#a1a1aa', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Referti</small>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#eee', marginTop: '5px' }}>{statsMedico.numero_referti}</div>
              </div>

              <div className="glass-panel" style={{ textAlign: 'center' }}>
                <small style={{ color: '#a1a1aa', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Pazienti</small>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#eee', marginTop: '5px' }}>{statsMedico.numero_pazienti}</div>
              </div>

            </div>
          </div>
          
          {/* 2. LISTA PAZIENTI ORDINATA ALFABETICAMENTE */}
          <div className="glass-card">
             <h2 style={{ fontSize: '1.2rem', marginBottom: '15px', fontWeight: '600' }}>I Tuoi Pazienti</h2>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {[...listaPazienti]
                  .sort((a, b) => a.cognome.localeCompare(b.cognome) || a.nome.localeCompare(b.nome))
                  .map(p => (
                  <div key={p.id_paziente} onClick={() => { 
                    setPazienteSelezionato(p); 
                    fetch(`${import.meta.env.VITE_API_URL}/api/medico/paziente/${p.id_paziente}/dettagli?id_medico=${userId}`)
                      .then(res => res.json())
                      .then(data => {
                        const unici = data.filter((v, i, a) => a.findIndex(t => t.id_prenotazione === v.id_prenotazione) === i);
                        setDettagliPaziente(unici);
                      });
                  }} className="glass-panel glass-panel-hoverable" style={{ textAlign: 'center' }}>
                    {p.nome} {p.cognome}
                  </div>
                ))}
             </div>
          </div>

          {/* 3. DETTAGLI E STORICO */}
          {pazienteSelezionato && (
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Storico: {pazienteSelezionato.nome} {pazienteSelezionato.cognome}</h2>
                <button onClick={() => setPazienteSelezionato(null)} className="glass-button" style={{ padding: '5px 12px', fontSize: '0.8rem', cursor: 'pointer' }}>Chiudi</button>
              </div>
              <ListaVisiteUI dati={dettagliPaziente} nomeUtente={`${pazienteSelezionato.nome} ${pazienteSelezionato.cognome}`} scaricaReferto={scaricaReferto} />
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 1. DASHBOARD PAZIENTE */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '15px', fontWeight: '600' }}>Riepilogo Profilo</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px' }}>
              
              <div className="glass-panel" style={{ textAlign: 'center' }}>
                <small style={{ color: '#a1a1aa', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Spesa Totale</small>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#93c47d', marginTop: '5px' }}>€{statsPaziente.fatture_pagate.toFixed(2)}</div>
              </div>
              
              <div className="glass-panel" style={{ textAlign: 'center' }}>
                <small style={{ color: '#a1a1aa', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Da Pagare</small>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: statsPaziente.fatture_da_pagare > 0 ? '#f1c40f' : '#eee', marginTop: '5px' }}>€{statsPaziente.fatture_da_pagare.toFixed(2)}</div>
              </div>

              <div className="glass-panel" style={{ textAlign: 'center' }}>
                <small style={{ color: '#a1a1aa', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Referti Pronti</small>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#eee', marginTop: '5px' }}>{statsPaziente.referti_emessi}</div>
              </div>

              <div className="glass-panel" style={{ textAlign: 'center' }}>
                <small style={{ color: '#a1a1aa', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Referti In Attesa</small>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#a1a1aa', marginTop: '5px' }}>{statsPaziente.referti_da_emettere}</div>
              </div>
              
            </div>
          </div>

          {/* 2. STORICO VISITE (Spostato SOPRA la nuova prenotazione) */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '15px', fontWeight: '600' }}>Il Tuo Storico Visite</h2>
            <ListaVisiteUI dati={dettagliPaziente} nomeUtente={`${utente.nome} ${utente.cognome}`} scaricaReferto={scaricaReferto} />
          </div>

          {/* 3. FORM DI PRENOTAZIONE */}
          <PrenotazioneForm idPaziente={userId} />
          
        </div>
      )}
    </div>
  );
}

// ==============================================================
// LISTA VISITE
// ==============================================================
function ListaVisiteUI({ dati, nomeUtente, scaricaReferto }) {
  if (!dati.length) return <p style={{ textAlign: 'center', color: '#a1a1aa', fontSize: '0.9rem', padding: '20px' }}>Nessun dato in archivio.</p>;
  
  const adesso = new Date();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {dati.map(item => {
        const [y, m, d] = item.data_visita.split("-");
        const [h, min] = (item.ora_visita || "00:00").split(":");
        const dataVisita = new Date(y, m - 1, d, h, min);
        const scaricabile = adesso > dataVisita;
        
        return (
          <div key={item.id_prenotazione} className="glass-panel glass-panel-hoverable" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden', gap: '15px' }}>
              <span style={{ color: '#93c47d', fontSize: '0.9rem', fontWeight: 'bold', flexShrink: 0 }}>
                {item.data_visita}
              </span>
              <span style={{ color: '#fff', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.motivo}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span style={{ color: '#a1a1aa', fontSize: '0.9rem', fontWeight: '500' }}>
                €{item.importo ? item.importo.toFixed(2) : '0.00'}
              </span>
              
              <button 
                disabled={!scaricabile} 
                onClick={() => scaricaReferto(item, nomeUtente)} 
                className="glass-button"
                style={{ 
                  width: '90px',         
                  padding: '8px 0', 
                  fontSize: '0.7rem', 
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  cursor: scaricabile ? 'pointer' : 'not-allowed'
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