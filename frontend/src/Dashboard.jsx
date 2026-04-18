import { useState, useEffect } from 'react';
import PrenotazioneForm from './PrenotazioneForm';
import { jsPDF } from "jspdf"; 

function Dashboard({ utente }) {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [statsMedico, setStatsMedico] = useState({ fatturato: 0, numero_referti: 0, numero_pazienti: 0 });
  const [listaPazienti, setListaPazienti] = useState([]);
  const [pazienteSelezionato, setPazienteSelezionato] = useState(null);
  
  const [dettagliPaziente, setDettagliPaziente] = useState([]);
  const [statsPaziente, setStatsPaziente] = useState({ fatture_pagate: 0, fatture_da_pagare: 0, referti_emessi: 0, referti_da_emettere: 0 });

  const userId = utente?.id_profilo || utente?.id ? Number(utente.id_profilo || utente.id) : null;

  // Funzione standard, protetta dal linter nel blocco useEffect
  const fetchData = () => {
    if (!utente || !userId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);

    if (utente.ruolo === 'Medico') {
      Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/medico/${userId}`).then(res => res.ok ? res.json() : { fatturato: 0, numero_referti: 0, numero_pazienti: 0 }),
        fetch(`${import.meta.env.VITE_API_URL}/api/medico/${userId}/pazienti`).then(res => res.ok ? res.json() : [])
      ]).then(([stats, pazienti]) => {
        setStatsMedico(stats);
        setListaPazienti(Array.isArray(pazienti) ? pazienti : []);
      }).catch(err => console.error(err)).finally(() => setLoading(false));
    } else {
      Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/medico/paziente/${userId}/dettagli`).then(res => res.ok ? res.json() : []),
        fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/paziente/${userId}`).then(res => res.ok ? res.json() : { fatture_pagate: 0, fatture_da_pagare: 0, referti_emessi: 0, referti_da_emettere: 0 })
      ]).then(([dettagli, stats]) => {
        setDettagliPaziente(Array.isArray(dettagli) ? dettagli : []);
        if(stats) setStatsPaziente(stats);
      }).catch(err => console.error(err)).finally(() => setLoading(false));
    }
  };

  useEffect(() => { 
    fetchData(); 
    // LA SOLUZIONE DEFINITIVA: Ignoriamo i falsi positivi di VS Code
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utente, userId]);

  const annullaVisita = (id) => {
    if (!window.confirm("Annullare questa prenotazione? La visita sparirà dallo storico.")) return;
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/api/prenotazioni/${id}/annulla`, { method: 'PUT' })
      .then(() => fetchData())
      .catch(() => setLoading(false));
  };

  const scaricaReferto = (item, nomeCompleto) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const verdeSalus = [147, 196, 125];
    const grigioScuro = [60, 60, 60];

    const nomeMedico = item.cognome_medico ? `Dr. ${item.nome_medico} ${item.cognome_medico}` : (utente.ruolo === 'Medico' ? `Dr. ${utente.nome} ${utente.cognome}` : "Dr. Specialista Salus Medica");

    doc.setTextColor(verdeSalus[0], verdeSalus[1], verdeSalus[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("SALUS MEDICA", 15, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(grigioScuro[0], grigioScuro[1], grigioScuro[2]);
    doc.text("Poliambulatorio Specialistico d'Eccellenza", 15, 26);
    doc.text("Via della Salute, 123 - 00100 Roma (RM)", 15, 31);
    doc.setDrawColor(verdeSalus[0], verdeSalus[1], verdeSalus[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 42, pageWidth - 15, 42);

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("REFERTO MEDICO SPECIALISTICO", pageWidth / 2, 55, { align: "center" });

    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(15, 62, pageWidth - 30, 28, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PAZIENTE:", 20, 70);
    doc.setFont("helvetica", "normal");
    doc.text(nomeCompleto.toUpperCase(), 45, 70);
    doc.setFont("helvetica", "bold");
    doc.text("C.F.:", 20, 78);
    doc.setFont("helvetica", "normal");
    doc.text(item.codice_fiscale || utente.codice_fiscale || "N.D.", 45, 78);

    doc.setFont("helvetica", "bold");
    doc.text("DATA:", pageWidth / 2 + 10, 70);
    doc.setFont("helvetica", "normal");
    doc.text(item.data_visita, pageWidth / 2 + 35, 70);
    doc.setFont("helvetica", "bold");
    doc.text("ID:", pageWidth / 2 + 10, 78);
    doc.setFont("helvetica", "normal");
    doc.text(`#SM-${item.id_prenotazione}`, pageWidth / 2 + 35, 78);

    let yPos = 110;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(verdeSalus[0], verdeSalus[1], verdeSalus[2]);
    doc.text("QUESITO DIAGNOSTICO", 15, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(grigioScuro[0], grigioScuro[1], grigioScuro[2]);
    doc.text(doc.splitTextToSize(item.motivo || "Visita specialistica.", pageWidth - 30), 15, yPos);

    yPos += 25;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(verdeSalus[0], verdeSalus[1], verdeSalus[2]);
    doc.text("ESAME OBIETTIVO E CONCLUSIONI", 15, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(grigioScuro[0], grigioScuro[1], grigioScuro[2]);
    doc.text(doc.splitTextToSize("L'esame clinico non evidenzia alterazioni patologiche di rilievo al momento della visita. Quadro clinico generale nei limiti della norma. Si consiglia controllo al bisogno o secondo indicazione medica.", pageWidth - 30), 15, yPos);

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 245, pageWidth - 15, 245);
    doc.text(`Roma, ${item.data_visita}`, 15, 255);
    doc.text("Il Medico Refertante", pageWidth - 70, 255);
    doc.setFont("helvetica", "bold");
    doc.text(nomeMedico, pageWidth - 70, 261);

    doc.save(`Referto_SalusMedica_${item.data_visita}.pdf`);
  };

  const saluto = utente?.sesso === 'F' ? 'Benvenuta' : 'Benvenuto';
  const prefisso = utente?.ruolo === 'Medico' 
    ? (utente.sesso === 'F' ? 'Dott.ssa' : 'Dott.') 
    : (utente?.sesso === 'F' ? 'Sig.ra' : 'Sig.');

  return (
    <div className="flex-column-gap">
      {loading && <div style={{ textAlign: 'center', color: '#93c47d', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '-10px' }}>Sincronizzazione dati in corso...</div>}

      <div>
        <h2 style={{ color: '#93c47d', margin: '0 0 5px 0', fontSize: '1.8rem', fontWeight: '800' }}>
          {saluto}, {prefisso} {utente?.nome} {utente?.cognome}
        </h2>
        <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.95rem' }}>
          Ecco il riepilogo della tua situazione su Salus Medica.
        </p>
      </div>

      {utente?.ruolo === 'Medico' ? (
        <>
          <div className="glass-card">
            <h2 className="section-title">Dashboard Medico</h2>
            <div className="grid-stats">
              <div className="glass-panel text-center"><small className="label-upper">Fatturato</small><div className="stat-value-green">€{Number(statsMedico?.fatturato || 0).toFixed(2)}</div></div>
              <div className="glass-panel text-center"><small className="label-upper">Referti</small><div className="stat-value">{statsMedico?.numero_referti || 0}</div></div>
              <div className="glass-panel text-center"><small className="label-upper">Pazienti</small><div className="stat-value">{statsMedico?.numero_pazienti || 0}</div></div>
            </div>
          </div>
          
          <div className="glass-card">
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
               <span style={{ fontSize: '1.5rem' }}>👥</span>
               <h2 className="section-title" style={{ margin: 0 }}>I Tuoi Pazienti</h2>
             </div>
             
             {/* NUOVA BARRA DI RICERCA GLASSMORPHISM */}
             <div style={{ 
               display: 'flex', 
               alignItems: 'center', 
               background: 'rgba(255, 255, 255, 0.05)', 
               border: '1px solid rgba(147, 196, 125, 0.3)', 
               borderRadius: '25px', 
               padding: '8px 15px', 
               marginBottom: '25px',
               boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
               backdropFilter: 'blur(10px)'
             }}>
               <span style={{ fontSize: '1.1rem', marginRight: '10px', filter: 'hue-rotate(90deg)' }}>🔍</span>
               <input 
                 type="text" 
                 style={{ 
                   flex: 1, 
                   background: 'transparent', 
                   border: 'none', 
                   color: '#fff', 
                   outline: 'none', 
                   fontSize: '0.95rem'
                 }} 
                 placeholder="Cerca paziente per nome o cognome..." 
                 value={searchTerm} 
                 onChange={e => setSearchTerm(e.target.value)} 
               />
               {searchTerm && (
                 <button 
                   onClick={() => setSearchTerm("")} 
                   style={{ 
                     background: 'rgba(255, 69, 58, 0.15)', 
                     border: '1px solid rgba(255, 69, 58, 0.3)',
                     color: '#ff453a', 
                     width: '26px',
                     height: '26px',
                     borderRadius: '50%',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     fontSize: '1.2rem', 
                     cursor: 'pointer', 
                     padding: '0', 
                     marginLeft: '10px',
                     transition: 'all 0.2s ease',
                     lineHeight: '1'
                   }}
                   onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 69, 58, 0.3)'}
                   onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 69, 58, 0.15)'}
                   title="Cancella ricerca"
                 >
                   &times;
                 </button>
               )}
             </div>
             {/* FINE BARRA DI RICERCA */}
             
             <div style={{ 
               display: 'grid', 
               gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
               gap: '20px' 
             }}>
                {listaPazienti
                  .filter(p => `${p.nome} ${p.cognome}`.toLowerCase().includes(searchTerm.toLowerCase()))
                  .sort((a, b) => a.cognome.localeCompare(b.cognome))
                  .map(p => {
                    const prefPaziente = p.sesso === 'F' ? 'Sig.ra' : 'Sig.';
                    let eta = '';
                    if (p.data_nascita) {
                      const dataNascita = new Date(p.data_nascita);
                      const oggi = new Date();
                      let calcoloEta = oggi.getFullYear() - dataNascita.getFullYear();
                      const m = oggi.getMonth() - dataNascita.getMonth();
                      if (m < 0 || (m === 0 && oggi.getDate() < dataNascita.getDate())) {
                        calcoloEta--;
                      }
                      eta = `${calcoloEta} anni`;
                    }

                    return (
                      <div 
                        key={p.id_paziente} 
                        onClick={() => { 
                          setPazienteSelezionato(p); 
                          fetch(`${import.meta.env.VITE_API_URL}/api/medico/paziente/${p.id_paziente}/dettagli?id_medico=${userId}`)
                            .then(res => res.json())
                            .then(setDettagliPaziente); 
                        }} 
                        className="glass-card glass-panel-hoverable" 
                        style={{ 
                          padding: '20px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '10px',
                          borderLeft: '4px solid #93c47d',
                          cursor: 'pointer',
                          margin: 0 
                        }}
                      >
                        <div>
                          <span style={{ 
                            display: 'inline-block', 
                            padding: '4px 10px', 
                            borderRadius: '20px', 
                            background: 'rgba(147, 196, 125, 0.15)', 
                            color: '#93c47d', 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: '10px'
                          }}>
                            Paziente
                          </span>
                          
                          <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color: '#fff' }}>
                            {prefPaziente} {p.cognome} {p.nome}
                          </h3>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.05)', margin: '5px 0' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#a1a1aa' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span title="Codice Fiscale">💳</span> 
                            <span style={{ fontFamily: 'monospace', letterSpacing: '1px', color: '#e5e5e7' }}>
                              {p.codice_fiscale || 'C.F. non disponibile'}
                            </span>
                          </div>

                          {p.telefono ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>📞</span> {p.telefono}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5 }}>
                              <span>📞</span> Nessun recapito
                            </div>
                          )}
                          
                          {(eta || p.luogo_nascita) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>🎂</span> 
                              {eta && <span>{eta}</span>}
                              {eta && p.luogo_nascita && <span> • </span>}
                              {p.luogo_nascita && <span>{p.luogo_nascita}</span>}
                            </div>
                          )}
                        </div>
                        
                        <div style={{ textAlign: 'right', marginTop: '5px', fontSize: '0.75rem', color: '#93c47d', fontWeight: 'bold' }}>
                          Vedi Storico &rarr;
                        </div>
                      </div>
                    );
                })}
             </div>
          </div>

          {pazienteSelezionato && (
            <div className="glass-card" style={{ border: '1px solid rgba(147, 196, 125, 0.3)', boxShadow: '0 0 20px rgba(147, 196, 125, 0.1)' }}>
              <div className="flex-between-center mb-15">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>🗂️</span>
                  <h2 className="section-title-small" style={{ margin: 0, color: '#93c47d' }}>
                    Storico: {pazienteSelezionato.nome} {pazienteSelezionato.cognome}
                  </h2>
                </div>
                <button onClick={() => setPazienteSelezionato(null)} className="glass-button py-5">Chiudi</button>
              </div>
              <ListaVisiteUI dati={dettagliPaziente} nomeUtente={`${pazienteSelezionato.nome} ${pazienteSelezionato.cognome}`} scaricaReferto={scaricaReferto} annullaVisita={annullaVisita} />
            </div>
          )}
        </>
      ) : (
        <>
          <div className="glass-card">
            <h2 className="section-title">Riepilogo Dati</h2>
            <div className="grid-stats">
              <div className="glass-panel text-center"><small className="label-upper">Spesa Totale</small><div className="stat-value-green">€{Number(statsPaziente?.fatture_pagate || 0).toFixed(2)}</div></div>
              <div className="glass-panel text-center"><small className="label-upper">Da Pagare</small><div className="stat-value" style={{color: statsPaziente?.fatture_da_pagare > 0 ? '#f1c40f' : '#eee'}}>€{Number(statsPaziente?.fatture_da_pagare || 0).toFixed(2)}</div></div>
              <div className="glass-panel text-center"><small className="label-upper">Referti Pronti</small><div className="stat-value">{statsPaziente?.referti_emessi || 0}</div></div>
              <div className="glass-panel text-center"><small className="label-upper">In Attesa</small><div className="stat-value-gray">{statsPaziente?.referti_da_emettere || 0}</div></div>
            </div>
          </div>
          <div className="glass-card">
            <h2 className="section-title">Il Tuo Storico Visite</h2>
            <ListaVisiteUI dati={dettagliPaziente} nomeUtente={`${utente?.nome} ${utente?.cognome}`} scaricaReferto={scaricaReferto} annullaVisita={annullaVisita} />
          </div>
          <PrenotazioneForm idPaziente={userId} onPrenotazione={() => fetchData()} />
        </>
      )}
    </div>
  );
}

function ListaVisiteUI({ dati, nomeUtente, scaricaReferto, annullaVisita }) {
  const datiAttivi = dati.filter(i => i.stato !== "Annullata");
  if (!datiAttivi.length) return <p className="gray-text text-center py-20">Nessun dato in archivio.</p>;

  return (
    <div className="flex-column-gap-12">
      {datiAttivi.map(item => {
        const scaricabile = item.stato === "Confermata";
        const annullabile = item.stato === "In attesa";
        return (
          <div key={item.id_prenotazione} className="glass-panel flex-between-center">
            <div className="flex-center-gap-15 overflow-hidden">
              <span className="date-badge">{item.data_visita}</span>
              <span className="text-white truncate-text">{item.motivo}</span>
            </div>
            <div className="flex-center-gap-15">
              <span className="price-label">€{Number(item.importo || 0).toFixed(2)}</span>
              {annullabile && <button onClick={() => annullaVisita(item.id_prenotazione)} className="btn-link" style={{color: '#ff453a', textDecoration: 'none', fontWeight: 'bold'}}>ANNULLA</button>}
              <button disabled={!scaricabile} onClick={() => scaricaReferto(item, nomeUtente)} className="glass-button w-90" style={{fontSize: '0.7rem'}}>{scaricabile ? 'SCARICA' : 'ATTESA'}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Dashboard;