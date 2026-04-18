import { useState } from 'react';

function AuthForm({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({ 
    email: '', password: '', ruolo: 'Paziente',
    nome: '', cognome: '', codice_fiscale: '', telefono: '', data_nascita: '', specializzazione: '',
    sesso: '', luogo_nascita: ''
  });
  
  const [messaggio, setMessaggio] = useState({ testo: '', tipo: '' });
  const oggi = new Date().toISOString().split('T')[0];

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      let formattato = value;

      if (name === 'codice_fiscale') {
        formattato = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      } else if (name === 'telefono') {
        formattato = value.replace(/\D/g, '').slice(0, 10);
      } else if (name === 'nome' || name === 'cognome') {
        const soloLettere = value.replace(/[^a-zA-Z\s'àèéìòùÀÈÉÌÒÙ-]/g, '');
        formattato = soloLettere.charAt(0).toUpperCase() + soloLettere.slice(1);
      }

      const newData = { ...prev, [name]: formattato };

      if (!isLogin) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessaggio({ testo: 'Attendere...', tipo: 'info' });

    if (!isLogin) {
      // --- CONTROLLI PAZIENTE ---
      if (formData.ruolo === 'Paziente') {
        // NUOVO CONTROLLO: Il paziente NON può usare @salus.it
        if (formData.email.toLowerCase().endsWith('@salus.it')) {
          setMessaggio({ testo: "Il dominio @salus.it è riservato esclusivamente al personale medico.", tipo: 'errore' });
          return;
        }

        if (formData.codice_fiscale.length !== 16) {
          setMessaggio({ testo: 'Compila tutti i campi per generare il Codice Fiscale.', tipo: 'errore' });
          return;
        }
        if (formData.telefono.length > 0 && formData.telefono.length < 9) {
          setMessaggio({ testo: 'Inserisci un numero di telefono valido.', tipo: 'errore' });
          return;
        }
      }

      // --- CONTROLLI ETÀ E DATA DI NASCITA (Per tutti) ---
      if (formData.data_nascita) {
        const dataInserita = new Date(formData.data_nascita);
        const dataOdierna = new Date();
        
        let eta = dataOdierna.getFullYear() - dataInserita.getFullYear();
        const m = dataOdierna.getMonth() - dataInserita.getMonth();
        if (m < 0 || (m === 0 && dataOdierna.getDate() < dataInserita.getDate())) {
          eta--;
        }

        if (dataInserita > dataOdierna) {
          setMessaggio({ testo: 'La data di nascita non può essere nel futuro.', tipo: 'errore' });
          return;
        }
        if (dataInserita.getFullYear() < 1900) {
          setMessaggio({ testo: 'Inserisci un anno di nascita valido.', tipo: 'errore' });
          return;
        }
        if (formData.ruolo === 'Medico' && eta < 18) {
          setMessaggio({ testo: 'Un Medico deve essere maggiorenne (18+) per potersi registrare.', tipo: 'errore' });
          return;
        }
      }

      // --- CONTROLLI MEDICO ---
      if (formData.ruolo === 'Medico') {
        const partiEmail = formData.email.split('@');
        if (partiEmail.length !== 2 || partiEmail[1].toLowerCase() !== 'salus.it') {
          setMessaggio({ testo: "I medici devono usare l'email aziendale ufficiale (@salus.it).", tipo: 'errore' });
          return;
        }
      }
    }

    const url = isLogin ? `${import.meta.env.VITE_API_URL}/api/utenti/login` : `${import.meta.env.VITE_API_URL}/api/utenti/registrazione`;
    let bodyData = isLogin ? { email: formData.email, password: formData.password } : { ...formData };
    if (!isLogin && bodyData.data_nascita === '') bodyData.data_nascita = null;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessaggio({ testo: isLogin ? 'Accesso eseguito!' : 'Registrazione completata! Ora fai il login.', tipo: 'successo' });
        if (isLogin) {
          setTimeout(() => onLoginSuccess(data), 1000); 
        } else {
          setTimeout(() => setIsLogin(true), 1500);
        }
      } else {
        if (Array.isArray(data.detail)) {
          const campoErrato = data.detail[0].loc[data.detail[0].loc.length - 1];
          setMessaggio({ testo: `Errore nel campo "${campoErrato}".`, tipo: 'errore' });
        } else {
          setMessaggio({ testo: `Errore: ${data.detail}`, tipo: 'errore' });
        }
      }
    } catch (error) {
      console.error("Errore durante la fetch:", error);
      setMessaggio({ testo: 'Errore di connessione al server.', tipo: 'errore' });
    }
  };

  return (
    <div className="glass-card login-card">
      <h2 style={{ textAlign: 'center', color: '#93c47d', fontWeight: '600' }}>
        {isLogin ? 'Accesso al Sistema' : 'Nuova Registrazione'}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Email:</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required className="form-control" />
          </div>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label>Password:</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                required 
                className="form-control" 
                style={{ paddingRight: '40px' }} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                title={showPassword ? "Nascondi password" : "Mostra password"}
                style={{ 
                  position: 'absolute', right: '12px', background: 'none', border: 'none', 
                  color: '#93c47d', cursor: 'pointer', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', padding: '0' 
                }}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {!isLogin && (
          <>
            <div className="form-group" style={{ marginTop: '15px' }}>
              <label>Registrati come:</label>
              <select name="ruolo" value={formData.ruolo} onChange={handleChange} className="form-control">
                <option value="Paziente">Paziente</option>
                <option value="Medico">Medico Specialista</option>
              </select>
            </div>

            <hr style={{ margin: '20px 0', borderColor: 'rgba(255, 255, 255, 0.1)' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Nome:</label>
                <input type="text" name="nome" value={formData.nome} onChange={handleChange} required className="form-control" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Cognome:</label>
                <input type="text" name="cognome" value={formData.cognome} onChange={handleChange} required className="form-control" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Sesso:</label>
                <select name="sesso" value={formData.sesso} onChange={handleChange} required className="form-control">
                  <option value="">Seleziona...</option>
                  <option value="M">Maschio (M)</option>
                  <option value="F">Femmina (F)</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Data Nascita:</label>
                <input type="date" name="data_nascita" value={formData.data_nascita} onChange={handleChange} max={oggi} required className="form-control" style={{ colorScheme: 'dark' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '15px' }}>
              <label>Luogo di Nascita (Comune):</label>
              <input type="text" name="luogo_nascita" value={formData.luogo_nascita} onChange={handleChange} required className="form-control" placeholder="Es. Roma, Milano..." />
            </div>

            <div className="form-group" style={{ marginTop: '15px' }}>
              <label>Codice Fiscale (Autogenerato):</label>
              <input type="text" name="codice_fiscale" value={formData.codice_fiscale} disabled className="form-control" style={{ opacity: 0.7, cursor: 'not-allowed', fontWeight: 'bold', color: '#93c47d', letterSpacing: '1px' }} placeholder="Compila i dati anagrafici..." />
            </div>

            {formData.ruolo === 'Medico' && (
              <div className="form-group" style={{ marginTop: '15px' }}>
                <label>Specializzazione:</label>
                <select name="specializzazione" value={formData.specializzazione} onChange={handleChange} required className="form-control">
                  <option value="">-- Seleziona --</option>
                  <option value="Cardiologia">Cardiologia</option>
                  <option value="Dermatologia">Dermatologia</option>
                  <option value="Ortopedia">Ortopedia</option>
                  <option value="Neurologia">Neurologia</option>
                  <option value="Pediatria">Pediatria</option>
                </select>
              </div>
            )}

            <div className="form-group" style={{ marginTop: '15px' }}>
              <label>Telefono (Opzionale):</label>
              <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="form-control" placeholder="Es. 3331234567" />
            </div>
          </>
        )}

        <button type="submit" className="btn-submit" style={{ marginTop: '25px', width: '100%' }}>
          {isLogin ? 'Accedi' : 'Completa Registrazione'}
        </button>
      </form>

      {messaggio.testo && (
        <div style={{ marginTop: '15px', textAlign: 'center', color: messaggio.tipo === 'successo' ? '#93c47d' : (messaggio.tipo === 'errore' ? '#ff453a' : '#a1a1aa'), fontSize: '0.9rem', fontWeight: 'bold' }}>
          {messaggio.testo}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button type="button" onClick={() => { setIsLogin(!isLogin); setMessaggio({ testo: '', tipo: '' }); }} style={{ background: 'none', border: 'none', color: '#93c47d', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}>
          {isLogin ? "Nuovo utente? Crea un account" : "Hai già un account? Torna al login"}
        </button>
      </div>
    </div>
  );
}

export default AuthForm;