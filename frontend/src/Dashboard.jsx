import { useState, useEffect, useCallback } from 'react';
import PrenotazioneForm from './PrenotazioneForm';
import { jsPDF } from "jspdf"; 

/**
 * Componente core per l'orchestrazione delle interfacce applicative.
 * Risolve la topologia UI in base al payload RBAC fornito dall'autenticazione.
 * Funge da controller per la propagazione degli stati figli e la comunicazione di rete.
 * * @param {Object} props - L'oggetto delle proprietà passate al componente.
 * @param {Object} props.utente - Il payload JWT decodificato contenente l'identità dell'utente.
 */
function Dashboard({ utente }) {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [statsMedico, setStatsMedico] = useState({ fatturato: 0, numero_referti: 0, numero_pazienti: 0 });
  const [listaPazienti, setListaPazienti] = useState([]);
  const [pazienteSelezionato, setPazienteSelezionato] = useState(null);
  
  const [dettagliPaziente, setDettagliPaziente] = useState([]);
  const [statsPaziente, setStatsPaziente] = useState({ fatture_pagate: 0, fatture_da_pagare: 0, referti_emessi: 0, referti_da_emettere: 0 });

  const [paymentModal, setPaymentModal] = useState({ isOpen: false, item: null, processing: false });

  const userId = utente?.id_profilo || utente?.id ? Number(utente.id_profilo || utente.id) : null;

  /**
   * Strategia asincrona memoizzata per l'idratazione dello stato aggregato.
   * Implementa un pattern Promise.all per mitigare il waterfall networking e 
   * ridurre i tempi di caricamento del layer visuale.
   */
  const performFetch = useCallback(async () => {
    if (!utente || !userId) return;

    if (utente.ruolo === 'Medico') {
      try {
        const [stats, pazienti] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/medico/${userId}`).then(res => res.ok ? res.json() : { fatturato: 0, numero_referti: 0, numero_pazienti: 0 }),
          fetch(`${import.meta.env.VITE_API_URL}/api/medico/${userId}/pazienti`).then(res => res.ok ? res.json() : [])
        ]);
        setStatsMedico(stats);
        setListaPazienti(Array.isArray(pazienti) ? pazienti : []);
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        const [dettagli, stats] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/medico/paziente/${userId}/dettagli`).then(res => res.ok ? res.json() : []),
          fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/paziente/${userId}`).then(res => res.ok ? res.json() : { fatture_pagate: 0, fatture_da_pagare: 0, referti_emessi: 0, referti_da_emettere: 0 })
        ]);
        setDettagliPaziente(Array.isArray(dettagli) ? dettagli : []);
        if (stats) setStatsPaziente(stats);
      } catch (err) {
        console.error(err);
      }
    }
  }, [utente, userId]);

  /**
   * Hook di reattività per l'acquisizione sicura dei dati al caricamento del componente.
   * Modella i side-effect utilizzando pattern strutturati (try/finally ed escape isMounted) 
   * per bypassare i cascading render critici avvisati dalle policy rigorose di React 18+.
   */
  useEffect(() => { 
    let isMounted = true;

    const init = async () => {
      if (!utente || !userId) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        await performFetch();
      } catch (err) {
        console.error("Errore nel caricamento dati:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    init();

    return () => { isMounted = false; };
  }, [utente, userId, performFetch]);

  /**
   * Costringe una re-idratazione imperativa dell'albero dom forzando l'esposizione del layout loader.
   */
  const refreshData = async () => {
    setLoading(true);
    await performFetch();
    setLoading(false);
  };

  /**
   * Propaga le direttive di annullamento visita verso il backend e forza il teardown visivo dei dati correlati.
   * * @param {number} id - L'identificatore chiave della prenotazione da invalidare.
   */
  const annullaVisita = (id) => {
    if (!window.confirm("Annullare questa prenotazione? La visita sparirà dallo storico.")) return;
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/api/prenotazioni/${id}/annulla`, { method: 'PUT' })
      .then(() => refreshData())
      .catch(() => setLoading(false));
  };

  /**
   * Generatore PDF client-side isolato. Implementa la classe jsPDF istanziando dinamicamente
   * la configurazione di template per i documenti di refertazione clinica.
   * * @param {Object} item - Oggetto di riga contenente i metadati relazionali dell'appuntamento.
   * @param {string} nomeCompleto - Risoluzione pre-calcolata della stringa anagrafica del paziente.
   */
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

    const isPagata = item.pagata === true || item.pagata === 'Si' || String(item.pagata).toLowerCase() === 'true';
    if (!isPagata) {
      doc.setFillColor(255, 243, 207); 
      doc.setDrawColor(243, 156, 18);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, 94, pageWidth - 30, 10, 2, 2, 'FD');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(153, 102, 0); 
      doc.text("ATTENZIONE: PRESTAZIONE IN ATTESA DI SALDO DA PARTE DEL PAZIENTE", pageWidth / 2, 100, { align: "center" });
    }

    let yPos = 115;
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

  /**
   * Astrazione logica per incapsulare il controllo della modale di pagamento fittizio e
   * inoltrare l'alterazione dello schema contabile verso le API.
   * * @param {Event} e - Evento scatenante correlato alla sottomissione del form.
   */
  const gestisciPagamento = (e) => {
    e.preventDefault();
    setPaymentModal(prev => ({ ...prev, processing: true }));

    setTimeout(() => {
      fetch(`${import.meta.env.VITE_API_URL}/api/prenotazioni/${paymentModal.item.id_prenotazione}/paga`, { 
        method: 'PUT' 
      })
      .then(res => {
        if (!res.ok) throw new Error("Errore backend");
        return res.json();
      })
      .then(() => {
        setPaymentModal({ isOpen: false, item: null, processing: false });
        alert("Pagamento elaborato con successo!");
        refreshData(); 
      })
      .catch(() => {
        alert("Si è verificato un errore durante l'elaborazione del pagamento.");
        setPaymentModal(prev => ({ ...prev, processing: false }));
      });
    }, 1500);
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
              <div className="glass-panel text-center"><small className="label-upper">Fatturato Netto</small><div className="stat-value-green">€{Number(statsMedico?.fatturato || 0).toFixed(2)}</div></div>
              <div className="glass-panel text-center"><small className="label-upper">Referti</small><div className="stat-value">{statsMedico?.numero_referti || 0}</div></div>
              <div className="glass-panel text-center"><small className="label-upper">Pazienti</small><div className="stat-value">{statsMedico?.numero_pazienti || 0}</div></div>
            </div>
          </div>
          
          <div className="glass-card">
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
               <i className="fa-solid fa-users" style={{ fontSize: '1.5rem', color: '#e5e5e7' }}></i>
               <h2 className="section-title" style={{ margin: 0 }}>I Tuoi Pazienti</h2>
             </div>
             
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
               <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '1.1rem', marginRight: '10px', color: '#93c47d' }}></i>
               <input 
                 type="text" 
                 style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.95rem' }} 
                 placeholder="Cerca paziente per nome o cognome..." 
                 value={searchTerm} 
                 onChange={e => setSearchTerm(e.target.value)} 
               />
               {searchTerm && (
                 <button onClick={() => setSearchTerm("")} style={{ background: 'rgba(255, 69, 58, 0.15)', border: '1px solid rgba(255, 69, 58, 0.3)', color: '#ff453a', width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer', padding: '0', marginLeft: '10px', transition: 'all 0.2s ease', lineHeight: '1' }}>
                   &times;
                 </button>
               )}
             </div>
             
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
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
                            
                          setTimeout(() => {
                            const elementoStorico = document.getElementById("menu-storico-paziente");
                            if (elementoStorico) {
                              elementoStorico.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }, 150);
                        }} 
                        className="glass-card glass-panel-hoverable" 
                        style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '4px solid #93c47d', cursor: 'pointer', margin: 0 }}
                      >
                        <div>
                          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', background: 'rgba(147, 196, 125, 0.15)', color: '#93c47d', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                            Paziente
                          </span>
                          <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color: '#fff' }}>
                            {prefPaziente} {p.cognome} {p.nome}
                          </h3>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.05)', margin: '5px 0' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#a1a1aa' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-regular fa-id-card" title="Codice Fiscale"></i> 
                            <span style={{ fontFamily: 'monospace', letterSpacing: '1px', color: '#e5e5e7' }}>{p.codice_fiscale || 'C.F. non disponibile'}</span>
                          </div>
                          {p.telefono ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><i className="fa-solid fa-phone"></i> {p.telefono}</div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5 }}><i className="fa-solid fa-phone"></i> Nessun recapito</div>
                          )}
                          {(eta || p.luogo_nascita) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <i className="fa-solid fa-cake-candles"></i> 
                              {eta && <span>{eta}</span>}
                              {eta && p.luogo_nascita && <span> • </span>}
                              {p.luogo_nascita && <span>{p.luogo_nascita}</span>}
                            </div>
                          )}
                        </div>
                        <div style={{ textalign: 'right', marginTop: '5px', fontSize: '0.75rem', color: '#93c47d', fontWeight: 'bold' }}>
                          Vedi Storico <i className="fa-solid fa-arrow-down" style={{ marginLeft: '4px' }}></i>
                        </div>
                      </div>
                    );
                })}
             </div>
          </div>

          {pazienteSelezionato && (
            <div id="menu-storico-paziente" className="glass-card" style={{ border: '1px solid rgba(147, 196, 125, 0.3)', boxShadow: '0 0 20px rgba(147, 196, 125, 0.1)' }}>
              <div className="flex-between-center mb-15">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-folder-open" style={{ fontSize: '1.5rem', color: '#93c47d' }}></i>
                  <h2 className="section-title-small" style={{ margin: 0, color: '#93c47d' }}>
                    Storico: {pazienteSelezionato.nome} {pazienteSelezionato.cognome}
                  </h2>
                </div>
                <button onClick={() => setPazienteSelezionato(null)} className="glass-button py-5">Chiudi</button>
              </div>
              <ListaVisiteUI 
                dati={dettagliPaziente} 
                nomeUtente={`${pazienteSelezionato.nome} ${pazienteSelezionato.cognome}`} 
                scaricaReferto={scaricaReferto} 
                annullaVisita={annullaVisita} 
                ruolo={utente?.ruolo} 
              />
            </div>
          )}
        </>
      ) : (
        <>
          <div className="glass-card">
            <h2 className="section-title">Riepilogo Dati</h2>
            <div className="grid-stats">
              <div className="glass-panel text-center"><small className="label-upper">Spesa Effettuata</small><div className="stat-value-green">€{Number(statsPaziente?.fatture_pagate || 0).toFixed(2)}</div></div>
              <div className="glass-panel text-center"><small className="label-upper">Da Pagare</small><div className="stat-value" style={{color: statsPaziente?.fatture_da_pagare > 0 ? '#f39c12' : '#eee'}}>€{Number(statsPaziente?.fatture_da_pagare || 0).toFixed(2)}</div></div>
              <div className="glass-panel text-center"><small className="label-upper">Referti Pronti</small><div className="stat-value">{statsPaziente?.referti_emessi || 0}</div></div>
              <div className="glass-panel text-center"><small className="label-upper">In Attesa</small><div className="stat-value-gray">{statsPaziente?.referti_da_emettere || 0}</div></div>
            </div>
          </div>
          <div className="glass-card">
            <h2 className="section-title">Il Tuo Storico Visite</h2>
            <ListaVisiteUI 
              dati={dettagliPaziente} 
              nomeUtente={`${utente?.nome} ${utente?.cognome}`} 
              scaricaReferto={scaricaReferto} 
              annullaVisita={annullaVisita} 
              ruolo={utente?.ruolo} 
              onApriPagamento={(item) => setPaymentModal({ isOpen: true, item, processing: false })}
            />
          </div>
          <PrenotazioneForm idPaziente={userId} onPrenotazione={() => refreshData()} />
        </>
      )}

      {paymentModal.isOpen && paymentModal.item && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000,
          padding: '20px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '30px', position: 'relative', border: '1px solid rgba(147, 196, 125, 0.4)' }}>
            <h2 style={{ margin: '0 0 10px 0', color: '#93c47d', textAlign: 'left', fontSize: '1.4rem' }}>Pagamento Sicuro</h2>
            <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '20px' }}>
              Stai per saldare la visita specialistica del <strong>{paymentModal.item.data_visita}</strong>.
            </p>
            
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#e5e5e7' }}>Importo totale:</span>
              <strong style={{ fontSize: '1.6rem', color: '#fff' }}>€{Number(paymentModal.item.importo).toFixed(2)}</strong>
            </div>

            <form onSubmit={gestisciPagamento} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Intestatario Carta</label>
                <input type="text" className="form-control" required defaultValue={`${utente?.nome} ${utente?.cognome}`} />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Numero Carta (Finto)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="1234 5678 9101 1121" 
                  required 
                  maxLength="16" 
                  onInput={(e) => e.target.value = e.target.value.replace(/\D/g, '')}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Scadenza</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="MM/YY" 
                    required 
                    maxLength="5" 
                    onInput={(e) => e.target.value = e.target.value.replace(/[^0-9/]/g, '')}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>CVV</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="123" 
                    required 
                    maxLength="3" 
                    onInput={(e) => e.target.value = e.target.value.replace(/\D/g, '')}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" className="glass-button" style={{ flex: 2, background: paymentModal.processing ? '#555' : 'var(--salus-green)', color: paymentModal.processing ? '#ccc' : '#0d0d0f' }} disabled={paymentModal.processing}>
                  {paymentModal.processing ? 'Elaborazione in corso...' : 'PAGA ORA'}
                </button>
                <button type="button" onClick={() => setPaymentModal({ isOpen: false, item: null, processing: false })} className="glass-button" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }} disabled={paymentModal.processing}>
                  ANNULLA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Routine di formattazione tassonomica.
 * Converte le nomenclature mediche grezze in etichette applicative strutturate destinate alla UI.
 * * @param {string} specializzazione - Stringa grezza della specializzazione associata al medico.
 * @returns {string} L'etichetta estesa della visita clinica.
 */
function formattaTipoVisita(specializzazione) {
  if (!specializzazione) return 'Visita Specialistica';
  const s = specializzazione.trim();
  const lower = s.toLowerCase();
  if (lower === 'nutrizionista') return 'Visita Nutrizionale';
  if (lower === 'medicina generale') return 'Visita Medica Generale';
  if (lower === 'dentista') return 'Visita Odontoiatrica';
  if (lower.endsWith('ica')) return `Visita ${s}`;
  if (lower.endsWith('ia')) return `Visita ${s.slice(0, -2)}ica`;
  return `Visita - ${s}`;
}

/**
 * Fragment component per il rendering iterativo dello storico visite.
 * Distribuisce condizionatamente gli handler delle interazioni utente (pagamento, scaricamento referto, annullamento)
 * modellandoli contro la matrice dello stato della prenotazione.
 * * @param {Object} props - L'oggetto delle proprietà passate al frammento UI.
 */
function ListaVisiteUI({ dati, nomeUtente, scaricaReferto, annullaVisita, ruolo, onApriPagamento }) {
  const datiAttivi = dati.filter(i => i.stato !== "Annullata");
  
  if (!datiAttivi.length) return <p className="gray-text text-center py-20">Nessun dato in archivio.</p>;

  return (
    <div className="flex-column-gap-12">
      {datiAttivi.map(item => {
        const isPagata = item.pagata === true || item.pagata === 'Si' || String(item.pagata).toLowerCase() === 'true';
        const isPassata = item.stato === "Confermata";
        const annullabile = item.stato === "In attesa";

        return (
          <div key={item.id_prenotazione} className="glass-panel flex-between-center">
            <div className="flex-center-gap-15 overflow-hidden">
              <span className="date-badge">{item.data_visita}</span>
              <span className="text-white truncate-text" title={`Motivo: ${item.motivo}`}>
                {formattaTipoVisita(item.specializzazione_medico)}
              </span>
            </div>
            
            <div className="flex-center-gap-15" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <span className="price-label">€{Number(item.importo || 0).toFixed(2)}</span>
              
              {annullabile && <button onClick={() => annullaVisita(item.id_prenotazione)} className="btn-link" style={{color: '#ff453a', textDecoration: 'none', fontWeight: 'bold'}}>ANNULLA</button>}
              
              {!isPassata && (
                isPagata ? (
                  <button disabled className="glass-button" style={{fontSize: '0.7rem', opacity: 0.8, color: 'var(--salus-green)', borderColor: 'var(--salus-green)', background: 'transparent'}}>
                    PAGATA (ATTESA)
                  </button>
                ) : (
                  <button disabled className="glass-button" style={{fontSize: '0.7rem', opacity: 0.5}} title="Il saldo è consentito solo dopo lo svolgimento della prestazione">
                    DA SALDARE POST-VISITA
                  </button>
                )
              )}

              {isPassata && (
                isPagata ? (
                  <button onClick={() => scaricaReferto(item, nomeUtente)} className="glass-button w-90" style={{fontSize: '0.7rem', background: 'var(--salus-green)', color: '#0d0d0f'}}>
                    SCARICA
                  </button>
                ) : (
                  ruolo === 'Paziente' ? (
                    <button onClick={() => onApriPagamento(item)} className="glass-button" style={{fontSize: '0.75rem', background: '#f39c12', color: '#fff', borderColor: '#f39c12'}}>
                      PAGA ORA
                    </button>
                  ) : (
                    <button onClick={() => scaricaReferto(item, nomeUtente)} className="glass-button" style={{fontSize: '0.7rem', background: 'rgba(243, 156, 18, 0.15)', color: '#f39c12', borderColor: '#f39c12'}}>
                      SCARICA (NON PAGATA)
                    </button>
                  )
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Dashboard;