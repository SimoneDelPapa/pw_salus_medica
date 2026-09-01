import { useState, useEffect, useCallback } from 'react';
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

  const [paymentModal, setPaymentModal] = useState({ isOpen: false, item: null, processing: false });

  const userId = utente?.id_profilo || utente?.id ? Number(utente.id_profilo || utente.id) : null;

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

  const refreshData = async () => {
    setLoading(true);
    await performFetch();
    setLoading(false);
  };

  const annullaVisita = async (id) => {
    if (!window.confirm("Annullare questa prenotazione? La visita sparirà dallo storico.")) return;
    setLoading(true);
    
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/prenotazioni/${id}/annulla`, { method: 'PUT' });
      
      if (utente?.ruolo === 'Medico' && pazienteSelezionato) {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/medico/paziente/${pazienteSelezionato.id_paziente}/dettagli?id_medico=${userId}`);
        const dati = await res.json();
        const datiAttivi = dati.filter(i => i.stato !== "Annullata");
        
        if (datiAttivi.length === 0) {
          setPazienteSelezionato(null);
        } else {
          setDettagliPaziente(dati);
        }
      }
      
      await refreshData();
      
    } catch (err) {
      console.error("Errore durante l'annullamento:", err);
      setLoading(false);
    }
  };

  const scaricaReferto = (item, nomeCompleto) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const verdeSalus = [147, 196, 125];
    const grigioScuro = [60, 60, 60];

    const prefissoMed = getPrefissoMedico(item.sesso_medico);
    const prefissoUtente = utente.sesso === 'F' ? 'Dott.ssa' : 'Dott.';
    
    const nomeMedico = item.cognome_medico 
      ? `${prefissoMed} ${item.nome_medico} ${item.cognome_medico}` 
      : (utente.ruolo === 'Medico' ? `${prefissoUtente} ${utente.nome} ${utente.cognome}` : "Specialista Salus Medica");

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
    doc.text("DATA/ORA:", pageWidth / 2 + 10, 70);
    doc.setFont("helvetica", "normal");
    doc.text(`${item.data_visita} - ${item.ora_visita || '00:00'}`, pageWidth / 2 + 35, 70);
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

  const scaricaFattura = (item, nomeCompleto) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const verdeSalus = [147, 196, 125];
    const grigioScuro = [60, 60, 60];

    const prefissoMed = getPrefissoMedico(item.sesso_medico);
    const prefissoUtente = utente.sesso === 'F' ? 'Dott.ssa' : 'Dott.';
    const nomeMedico = item.cognome_medico 
      ? `${prefissoMed} ${item.nome_medico} ${item.cognome_medico}` 
      : (utente.ruolo === 'Medico' ? `${prefissoUtente} ${utente.nome} ${utente.cognome}` : "Specialista Salus Medica");

    const isPagata = item.pagata === true || item.pagata === 'Si' || String(item.pagata).toLowerCase() === 'true';

    // 1. Intestazione Poliambulatorio
    doc.setTextColor(verdeSalus[0], verdeSalus[1], verdeSalus[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("SALUS MEDICA", 15, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(grigioScuro[0], grigioScuro[1], grigioScuro[2]);
    doc.text("Poliambulatorio Specialistico d'Eccellenza", 15, 26);
    doc.text("Via della Salute, 123 - 00100 Roma (RM) | P.IVA 08912341005", 15, 32);

    doc.setDrawColor(verdeSalus[0], verdeSalus[1], verdeSalus[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 38, pageWidth - 15, 38);

    // 2. Titolo Fattura
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    const annoFattura = item.data_visita ? item.data_visita.split("-")[0] : new Date().getFullYear();
    doc.text(`FATTURA SANITARIA N. ${item.id_prenotazione}/${annoFattura}`, pageWidth / 2, 50, { align: "center" });

    // 3. Box Dati Intestatario e Documento
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(15, 58, pageWidth - 30, 36, 3, 3, 'FD');

    doc.setFontSize(9.5);
    // Colonna Sinistra: Dati Paziente
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text("INTESTATARIO:", 20, 68);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(nomeCompleto.toUpperCase(), 55, 68);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text("CODICE FISCALE:", 20, 78);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(item.codice_fiscale || utente.codice_fiscale || "N.D.", 55, 78);

    // Colonna Destra: Metadati Fattura
    const colDestraX = 115;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text("DATA EMISSIONE:", colDestraX, 68);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`${item.data_visita}`, colDestraX + 38, 68);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text("STATO PAGAMENTO:", colDestraX, 78);
    doc.setFont("helvetica", "bold");
    if (isPagata) {
      doc.setTextColor(39, 174, 96);
      doc.text("SALDATA", colDestraX + 38, 78);
    } else {
      doc.setTextColor(231, 76, 60);
      doc.text("DA SALDARE", colDestraX + 38, 78);
    }

    // 4. Tabella Dettaglio Prestazione
    const yTabella = 105;
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yTabella, pageWidth - 30, 9, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text("DESCRIZIONE PRESTAZIONE", 20, yTabella + 6);
    doc.text("SPECIALISTA", 105, yTabella + 6);
    doc.text("IMPORTO", pageWidth - 20, yTabella + 6, { align: "right" });

    // Righe Tabella
    const yRiga = yTabella + 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(grigioScuro[0], grigioScuro[1], grigioScuro[2]);
    doc.text(formattaTipoVisita(item.specializzazione_medico), 20, yRiga);
    doc.text(nomeMedico, 105, yRiga);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`€ ${Number(item.importo || 0).toFixed(2)}`, pageWidth - 20, yRiga, { align: "right" });

    doc.setDrawColor(220, 220, 220);
    doc.line(15, yRiga + 8, pageWidth - 15, yRiga + 8);

    // 5. Box Totali e Conteggio Fiscale
    const yTotali = yRiga + 20;
    const labelX = pageWidth - 110;
    const valueX = pageWidth - 20;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 70);
    doc.text("Totale Imponibile:", labelX, yTotali);
    doc.text(`€ ${Number(item.importo || 0).toFixed(2)}`, valueX, yTotali, { align: "right" });

    doc.text("IVA (Esente art. 10 DPR 633/72):", labelX, yTotali + 8);
    doc.text("€ 0.00", valueX, yTotali + 8, { align: "right" });

    doc.setDrawColor(verdeSalus[0], verdeSalus[1], verdeSalus[2]);
    doc.setLineWidth(0.5);
    doc.line(labelX, yTotali + 13, valueX, yTotali + 13);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(verdeSalus[0], verdeSalus[1], verdeSalus[2]);
    doc.text("TOTALE FATTURA:", labelX, yTotali + 22);
    doc.text(`€ ${Number(item.importo || 0).toFixed(2)}`, valueX, yTotali + 22, { align: "right" });

    // 6. Note Legali e Piè di Pagina
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Operazione sanitaria esente da IVA ai sensi dell'art. 10, n. 18, D.P.R. 633/1972.", 15, 235);
    doc.text("Documento fiscale emesso elettronicamente tramite sistema gestionale Salus Medica.", 15, 241);

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(15, 248, pageWidth - 15, 248);

    doc.setFont("helvetica", "normal");
    doc.text(`Documento generato il: ${new Date().toLocaleDateString('it-IT')}`, 15, 256);
    doc.text("Salus Medica S.r.l. - Amministrazione", pageWidth - 75, 256);

    doc.save(`Fattura_SalusMedica_${item.id_prenotazione}_${item.data_visita}.pdf`);
  };

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
                scaricaFattura={scaricaFattura}
                annullaVisita={annullaVisita} 
                ruolo={utente?.ruolo} 
              />
            </div>
          )}
        </>
      ) : (
        <>
          <div className="glass-card">
            <h2 className="section-title">Dashboard Paziente</h2>
            <div className="grid-stats">
              <div className="glass-panel text-center"><small className="label-upper">Spesa Effettuata</small><div className="stat-value-green">€{Number(statsPaziente?.fatture_pagate || 0).toFixed(2)}</div></div>
              <div className="glass-panel text-center"><small className="label-upper">Da Pagare</small><div className="stat-value" style={{color: statsPaziente?.fatture_da_pagare > 0 ? '#f39c12' : '#eee'}}>€{Number(statsPaziente?.fatture_da_pagare || 0).toFixed(2)}</div></div>
              <div className="glass-panel text-center"><small className="label-upper">Referti Pronti</small><div className="stat-value">{statsPaziente?.referti_emessi || 0}</div></div>
              <div className="glass-panel text-center"><small className="label-upper">In Attesa</small><div className="stat-value-gray">{statsPaziente?.referti_da_emettere || 0}</div></div>
            </div>
          </div>
          
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: '1.5rem', color: '#e5e5e7' }}></i>
              <h2 className="section-title" style={{ margin: 0 }}>Il Tuo Storico Visite</h2>
            </div>
            <ListaVisiteUI 
              dati={dettagliPaziente} 
              nomeUtente={`${utente?.nome} ${utente?.cognome}`} 
              scaricaReferto={scaricaReferto} 
              scaricaFattura={scaricaFattura}
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
              Stai per saldare la visita specialistica del <strong>{paymentModal.item.data_visita} alle ore {paymentModal.item.ora_visita}</strong>.
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

function getPrefissoMedico(sesso) {
  return sesso === 'F' ? 'Dott.ssa' : 'Dott.';
}

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

function ListaVisiteUI({ dati, nomeUtente, scaricaReferto, scaricaFattura, annullaVisita, ruolo, onApriPagamento }) {
  const datiAttivi = dati.filter(i => i.stato !== "Annullata");
  
  if (!datiAttivi.length) return <p className="gray-text text-center py-20">Nessun dato in archivio.</p>;

  return (
    <div className="flex-column-gap-12">
      {datiAttivi.map(item => {
        const isPagata = item.pagata === true || item.pagata === 'Si' || String(item.pagata).toLowerCase() === 'true';
        const isPassata = item.stato === "Confermata";
        const annullabile = item.stato === "In attesa";
        
        const prefissoMed = getPrefissoMedico(item.sesso_medico);

        return (
          <div key={item.id_prenotazione} className="glass-panel flex-between-center" style={{ gap: '15px' }}>
            
            <div className="flex-center-gap-15 overflow-hidden" style={{ alignItems: 'center' }}>
              
              <div className="date-badge" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.4', padding: '6px 12px' }}>
                <span style={{ fontWeight: 'bold' }}>{item.data_visita}</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>{item.ora_visita || '00:00'}</span>
              </div>
              
              <div style={{ width: '1px', height: '40px', backgroundColor: 'rgba(255, 255, 255, 0.15)' }}></div>

              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', justifyContent: 'center' }}>
                <span className="text-white truncate-text" style={{ fontSize: '1rem', fontWeight: '500' }} title={`Motivo: ${item.motivo}`}>
                  {formattaTipoVisita(item.specializzazione_medico)}
                </span>
                
                {item.cognome_medico && ruolo !== 'Medico' && (
                  <span className="truncate-text" style={{ fontSize: '0.85rem', color: '#93c47d' }}>
                    {prefissoMed} {item.nome_medico} {item.cognome_medico}
                  </span>
                )}
              </div>

            </div>
            
            <div className="flex-center-gap-15" style={{ flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
              <span className="price-label">€{Number(item.importo || 0).toFixed(2)}</span>
              
              {annullabile && (
                <button onClick={() => annullaVisita(item.id_prenotazione)} className="btn-link" style={{color: '#ff453a', textDecoration: 'none', fontWeight: 'bold'}}>
                  ANNULLA
                </button>
              )}
              
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '110px' }}>
                  {/* PULSANTE REFERTO (SOPRA) */}
                  {isPagata ? (
                    <button 
                      onClick={() => scaricaReferto(item, nomeUtente)} 
                      className="glass-button" 
                      style={{
                        fontSize: '0.7rem', 
                        background: 'var(--salus-green)', 
                        color: '#0d0d0f',
                        borderColor: 'var(--salus-green)',
                        padding: '5px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        width: '100%'
                      }}
                    >
                      <i className="fa-solid fa-file-medical" style={{ fontSize: '0.8rem' }}></i> Referto
                    </button>
                  ) : (
                    ruolo === 'Paziente' ? (
                      <button 
                        disabled
                        className="glass-button" 
                        title="Saldo richiesto per visualizzare e scaricare il referto clinico"
                        style={{
                          fontSize: '0.7rem', 
                          background: 'rgba(255, 255, 255, 0.05)', 
                          color: '#71717a', 
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          padding: '5px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          width: '100%',
                          cursor: 'not-allowed',
                          opacity: 0.6
                        }}
                      >
                        <i className="fa-solid fa-lock" style={{ fontSize: '0.75rem' }}></i> Referto (Bloccato)
                      </button>
                    ) : (
                      <button 
                        onClick={() => scaricaReferto(item, nomeUtente)} 
                        className="glass-button" 
                        style={{
                          fontSize: '0.7rem', 
                          background: 'rgba(243, 156, 18, 0.15)', 
                          color: '#f39c12', 
                          borderColor: '#f39c12',
                          padding: '5px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          width: '100%'
                        }}
                      >
                        <i className="fa-solid fa-file-medical" style={{ fontSize: '0.8rem' }}></i> Referto
                      </button>
                    )
                  )}

                  {/* PULSANTE FATTURA / PAGAMENTO (SOTTO) */}
                  {isPagata ? (
                    <button 
                      onClick={() => scaricaFattura(item, nomeUtente)} 
                      className="glass-button" 
                      style={{
                        fontSize: '0.7rem', 
                        background: 'rgba(255, 255, 255, 0.08)', 
                        color: '#e5e5e7', 
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        padding: '5px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        width: '100%'
                      }}
                    >
                      <i className="fa-solid fa-file-invoice-dollar" style={{ fontSize: '0.8rem' }}></i> Fattura
                    </button>
                  ) : (
                    ruolo === 'Paziente' ? (
                      <button 
                        onClick={() => onApriPagamento(item)} 
                        className="glass-button" 
                        style={{
                          fontSize: '0.7rem', 
                          background: '#f39c12', 
                          color: '#fff', 
                          borderColor: '#f39c12',
                          padding: '5px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          width: '100%'
                        }}
                      >
                        <i className="fa-solid fa-credit-card" style={{ fontSize: '0.8rem' }}></i> PAGA ORA
                      </button>
                    ) : (
                      <button 
                        onClick={() => scaricaFattura(item, nomeUtente)} 
                        className="glass-button" 
                        style={{
                          fontSize: '0.7rem', 
                          background: 'rgba(243, 156, 18, 0.08)', 
                          color: '#f39c12', 
                          borderColor: 'rgba(243, 156, 18, 0.3)',
                          padding: '5px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          width: '100%'
                        }}
                      >
                        <i className="fa-solid fa-file-invoice" style={{ fontSize: '0.8rem' }}></i> Fatt. (Attesa)
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Dashboard;