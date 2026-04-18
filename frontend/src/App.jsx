import { useState } from 'react';
import './index.css';
import AuthForm from './AuthForm';
import MediciList from './MediciList';
import Dashboard from './Dashboard';

function App() {
  const [utenteLoggato, setUtenteLoggato] = useState(() => {
    const utenteSalvato = localStorage.getItem('utenteSalusMedica');
    return utenteSalvato ? JSON.parse(utenteSalvato) : null;
  });

  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({
    nome: utenteLoggato?.nome || "",
    cognome: utenteLoggato?.cognome || "",
    sesso: utenteLoggato?.sesso || "",
    data_nascita: utenteLoggato?.data_nascita || "",
    luogo_nascita: utenteLoggato?.luogo_nascita || "",
    codice_fiscale: utenteLoggato?.codice_fiscale || "",
    telefono: utenteLoggato?.telefono || "",
    specializzazione: utenteLoggato?.specializzazione || ""
  });

  // ==========================================
  // FUNZIONE PURA: CALCOLO CODICE FISCALE
  // ==========================================
  const generaCodiceFiscale = (nome, cognome, sesso, data_nascita, luogo_nascita) => {
    if (!nome || !cognome || !sesso || !data_nascita || !luogo_nascita) return '';

    const getConsonanti = (str) => str.toUpperCase().replace(/[^A-Z]/g, '').replace(/[AEIOU]/g, '');
    const getVocali = (str) => str.toUpperCase().replace(/[^A-Z]/g, '').replace(/[^AEIOU]/g, '');
    
    let consC = getConsonanti(cognome);
    let vocC = getVocali(cognome);
    let cfCognome = (consC + vocC + "XXX").substring(0, 3);
    
    let consN = getConsonanti(nome);
    let vocN = getVocali(nome);
    let cfNome = consN.length >= 4 ? consN[0] + consN[2] + consN[3] : (consN + vocN + "XXX").substring(0, 3);
    
    let dateObj = new Date(data_nascita);
    let anno = dateObj.getFullYear().toString().substring(2, 4);
    let mesi = "ABCDEHLMPRST";
    let mese = mesi.charAt(dateObj.getMonth());
    
    let giorno = dateObj.getDate();
    if (sesso === 'F') giorno += 40; 
    let giornoStr = giorno < 10 ? "0" + giorno : giorno.toString();
    
    let comuneHash = luogo_nascita.toUpperCase().trim().replace(/[^A-Z]/g, '');
    let codiceComune = "X" + (comuneHash.charCodeAt(0) * 12 + comuneHash.length).toString().padStart(3, '0').substring(0,3);
    if (comuneHash === "ROMA") codiceComune = "H501";
    if (comuneHash === "MILANO") codiceComune = "F205";
    if (comuneHash === "NAPOLI") codiceComune = "F839";
    if (comuneHash === "TORINO") codiceComune = "L219";
    
    let cfBase = cfCognome + cfNome + anno + mese + giornoStr + codiceComune;
    
    const setPari = { '0':0, '1':1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, 'A':0, 'B':1, 'C':2, 'D':3, 'E':4, 'F':5, 'G':6, 'H':7, 'I':8, 'J':9, 'K':10, 'L':11, 'M':12, 'N':13, 'O':14, 'P':15, 'Q':16, 'R':17, 'S':18, 'T':19, 'U':20, 'V':21, 'W':22, 'X':23, 'Y':24, 'Z':25 };
    const setDispari = { '0':1, '1':0, '2':5, '3':7, '4':9, '5':13, '6':15, '7':17, '8':19, '9':21, 'A':1, 'B':0, 'C':5, 'D':7, 'E':9, 'F':13, 'G':15, 'H':17, 'I':19, 'J':21, 'K':2, 'L':4, 'M':18, 'N':20, 'O':11, 'P':3, 'Q':6, 'R':8, 'S':12, 'T':14, 'U':16, 'V':10, 'W':22, 'X':25, 'Y':24, 'Z':23 };
    let somma = 0;
    for (let i = 0; i < 15; i++) {
       let c = cfBase.charAt(i);
       if ((i + 1) % 2 === 0) somma += setPari[c]; 
       else somma += setDispari[c]; 
    }
    let controlChar = String.fromCharCode(65 + (somma % 26));
    
    return cfBase + controlChar;
  };

  // ==========================================
  // GESTIONE MODIFICHE FORM
  // ==========================================
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    
    setProfileForm(prev => {
      let formattato = value;

      // Filtri e restrizioni durante la digitazione
      if (name === 'nome' || name === 'cognome') {
        formattato = value.replace(/[^a-zA-Z\s'àèéìòùÀÈÉÌÒÙ-]/g, '');
      } else if (name === 'telefono') {
        formattato = value.replace(/\D/g, '').slice(0, 10);
      }

      const newData = { ...prev, [name]: formattato };

      // Ricalcola il codice fiscale solo se cambia un dato anagrafico
      if (['nome', 'cognome', 'sesso', 'data_nascita', 'luogo_nascita'].includes(name)) {
        newData.codice_fiscale = generaCodiceFiscale(
          newData.nome,
          newData.cognome,
          newData.sesso,
          newData.data_nascita,
          newData.luogo_nascita
        );
      }

      return newData;
    });
  };

  const gestisciLogin = (data) => {
    const idRilevato = data.id_profilo || data.id_paziente || data.id_utente || data.id;
    const nuovoUtente = { 
      id: idRilevato, 
      ruolo: data.ruolo,
      nome: data.nome, 
      cognome: data.cognome,
      sesso: data.sesso || "",
      data_nascita: data.data_nascita || "",
      luogo_nascita: data.luogo_nascita || "",
      telefono: data.telefono || "",
      specializzazione: data.specializzazione || "",
      codice_fiscale: data.codice_fiscale || "" 
    };
    setUtenteLoggato(nuovoUtente);
    setProfileForm(nuovoUtente);
    localStorage.setItem('utenteSalusMedica', JSON.stringify(nuovoUtente)); 
  };

  const gestisciLogout = () => {
    setUtenteLoggato(null);
    setEditMode(false);
    localStorage.removeItem('utenteSalusMedica'); 
  };

  const salvaProfilo = (e) => {
    e.preventDefault();
    
    // --- NUOVO CONTROLLO: ETÀ MEDICO (18+) ---
    if (utenteLoggato.ruolo === 'Medico' && profileForm.data_nascita) {
      const dataInserita = new Date(profileForm.data_nascita);
      const dataOdierna = new Date();
      
      let eta = dataOdierna.getFullYear() - dataInserita.getFullYear();
      const m = dataOdierna.getMonth() - dataInserita.getMonth();
      if (m < 0 || (m === 0 && dataOdierna.getDate() < dataInserita.getDate())) {
        eta--;
      }

      if (eta < 18) {
        alert("Errore: Un Medico specialista deve essere maggiorenne (18+).");
        return; // Blocca immediatamente l'invio dei dati
      }
    }

    // Prepariamo il payload pulito
    const datiDaInviare = { ...profileForm };
    if (utenteLoggato.ruolo === 'Paziente') {
      delete datiDaInviare.specializzazione;
    }

    fetch(`${import.meta.env.VITE_API_URL}/api/utenti/profilo/${utenteLoggato.ruolo}/${utenteLoggato.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datiDaInviare)
    })
    .then(res => {
      if (!res.ok) throw new Error("Errore dal server");
      return res.json();
    })
    .then((data) => {
      const utenteAggiornato = { ...utenteLoggato, ...datiDaInviare };
      setUtenteLoggato(utenteAggiornato);
      localStorage.setItem('utenteSalusMedica', JSON.stringify(utenteAggiornato));
      setEditMode(false);
      alert(`Profilo aggiornato con successo!\n\n⚠️ ATTENZIONE: La tua email per i prossimi accessi è:\n${data.nuova_email}`);
    })
    .catch(err => {
      console.error(err);
      alert("C'è stato un errore durante l'aggiornamento del profilo. Verifica i dati inseriti.");
    });
  };

  return (
    <div className="app-container" style={{ position: 'relative', minHeight: '100vh', paddingBottom: '40px' }}>
      
      {utenteLoggato && (
        <div style={{ position: 'absolute', top: '30px', right: '30px', display: 'flex', alignItems: 'flex-start', gap: '15px', zIndex: 1000 }}>
          <div style={{ position: 'relative' }}>
            <div 
              className="glass-panel glass-panel-hoverable"
              onClick={() => setEditMode(!editMode)}
              style={{ textAlign: 'right', cursor: 'pointer', padding: '8px 16px', margin: 0, userSelect: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#93c47d', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{utenteLoggato.ruolo}</span>
                <span style={{ display: 'block', fontSize: '1rem', color: '#e5e5e7', fontWeight: '600' }}>{utenteLoggato.nome ? `${utenteLoggato.nome} ${utenteLoggato.cognome}` : 'Utente Salus'}</span>
              </div>
              <span style={{ color: '#93c47d', fontSize: '1.2rem', transition: 'transform 0.2s', transform: editMode ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
            </div>

            {editMode && (
              <div className="glass-card" style={{ position: 'absolute', top: 'calc(100% + 10px)', right: '0', width: '380px', padding: '20px', boxShadow: '0 15px 40px rgba(0,0,0,0.8)' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#93c47d' }}>Modifica Profilo</h3>
                
                <form onSubmit={salvaProfilo} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label>Nome</label>
                      <input name="nome" className="form-control" value={profileForm.nome} onChange={handleProfileChange} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label>Cognome</label>
                      <input name="cognome" className="form-control" value={profileForm.cognome} onChange={handleProfileChange} required />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Sesso</label>
                      <select name="sesso" className="form-control" value={profileForm.sesso} onChange={handleProfileChange} required>
                        <option value="">Seleziona...</option>
                        <option value="M">Maschio (M)</option>
                        <option value="F">Femmina (F)</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Data Nascita</label>
                      <input name="data_nascita" type="date" className="form-control" value={profileForm.data_nascita} onChange={handleProfileChange} required style={{ colorScheme: 'dark' }} />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label>Luogo di Nascita</label>
                    <input name="luogo_nascita" className="form-control" value={profileForm.luogo_nascita} onChange={handleProfileChange} required />
                  </div>

                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label>Codice Fiscale</label>
                    <input name="codice_fiscale" className="form-control" value={profileForm.codice_fiscale} disabled style={{ opacity: 0.6, cursor: 'not-allowed', color: '#93c47d', fontWeight: 'bold' }} title="Calcolato in automatico" />
                  </div>

                  {utenteLoggato.ruolo === 'Medico' && (
                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label>Specializzazione</label>
                      <input name="specializzazione" className="form-control" value={profileForm.specializzazione} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} title="Contatta l'amministrazione per modifiche" />
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label>Telefono (Opzionale)</label>
                    <input name="telefono" type="tel" className="form-control" value={profileForm.telefono} onChange={handleProfileChange} />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="submit" className="glass-button" style={{ flex: 2, padding: '8px 0', fontSize: '0.85rem' }}>Salva Modifiche</button>
                    <button type="button" className="glass-button" style={{ flex: 1, padding: '8px 0', fontSize: '0.85rem', background: 'rgba(255,255,255,0.1)', color: '#fff' }} onClick={() => setEditMode(false)}>Annulla</button>
                  </div>
                </form>
              </div>
            )}
          </div>
          <button onClick={gestisciLogout} className="glass-button" style={{ padding: '12px 15px', fontWeight: 'bold', fontSize: '0.85rem', color: '#ff453a', border: '1px solid rgba(255, 69, 58, 0.3)', marginTop: '2px' }}>Esci</button>
        </div>
      )}

      <header className="header" style={{ position: 'relative', marginTop: utenteLoggato ? '110px' : '30px', maxWidth: utenteLoggato ? '100%' : '420px', margin: utenteLoggato ? '110px auto 25px auto' : '30px auto 25px auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '2px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#93c47d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 2px 4px rgba(147, 196, 125, 0.3))' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '900', color: '#93c47d', letterSpacing: '-0.5px' }}>Salus Medica</h1>
        </div>
        <p style={{ color: '#a1a1aa', fontSize: '0.95rem', fontStyle: 'italic', letterSpacing: '1px', margin: 0 }}>L'eccellenza medica a portata di click</p>
      </header>

      <main style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {!utenteLoggato ? (
          <div className="login-wrapper">
            <AuthForm onLoginSuccess={gestisciLogin} />
          </div>
        ) : (
          <>
            <Dashboard utente={utenteLoggato} />
            <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.05)', margin: '0' }} />
            <MediciList />
          </>
        )}
      </main>
    </div>
  );
}

export default App;