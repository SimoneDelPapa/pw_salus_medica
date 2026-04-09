import { useState } from 'react';

function AuthForm({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({ 
    email: '', password: '', ruolo: 'Paziente',
    nome: '', cognome: '', codice_fiscale: '', telefono: '', data_nascita: '', specializzazione: ''
  });
  
  const [messaggio, setMessaggio] = useState({ testo: '', tipo: '' });

  const oggi = new Date().toISOString().split('T')[0];

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'codice_fiscale') {
      setFormData({ ...formData, [name]: value.toUpperCase().replace(/[^A-Z0-9]/g, '') });
    } else if (name === 'telefono') {
      setFormData({ ...formData, [name]: value.replace(/\D/g, '') });
    } else if (name === 'nome' || name === 'cognome') {
      const soloLettere = value.replace(/[^a-zA-Z\s'àèéìòùÀÈÉÌÒÙ-]/g, '');
      const formattato = soloLettere.charAt(0).toUpperCase() + soloLettere.slice(1);
      setFormData({ ...formData, [name]: formattato });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessaggio({ testo: 'Attendere...', tipo: 'info' });

    // CONTROLLI DI VALIDAZIONE PRIMA DELL'INVIO (SOLO IN REGISTRAZIONE)
    if (!isLogin) {
      
      // 1. CONTROLLO SICUREZZA PER I MEDICI (Email aziendale)
      if (formData.ruolo === 'Medico') {
        // Dividiamo l'email dalla chiocciola
        const partiEmail = formData.email.split('@');
        
        // Se non ci sono esattamente due parti, o se il dominio non è salus.it, blocca.
        if (partiEmail.length !== 2 || partiEmail[1].toLowerCase() !== 'salus.it') {
          setMessaggio({ 
            testo: "I medici devono usare l'email aziendale ufficiale (@salus.it).", 
            tipo: 'errore' 
          });
          return;
        }
      } 
      
      // 2. CONTROLLI PER I PAZIENTI
      else if (formData.ruolo === 'Paziente') {
        if (formData.codice_fiscale.length !== 16) {
          setMessaggio({ testo: 'Il Codice Fiscale deve essere di 16 caratteri.', tipo: 'errore' });
          return;
        }
        if (formData.telefono.length > 0 && (formData.telefono.length < 9 || formData.telefono.length > 11)) {
          setMessaggio({ testo: 'Inserisci un numero di telefono valido (9-11 cifre).', tipo: 'errore' });
          return;
        }
        
        if (formData.data_nascita) {
          const dataInserita = new Date(formData.data_nascita);
          const dataOdierna = new Date();
          
          if (dataInserita > dataOdierna) {
            setMessaggio({ testo: 'La data di nascita non può essere nel futuro.', tipo: 'errore' });
            return;
          }
          if (dataInserita.getFullYear() < 1900) {
            setMessaggio({ testo: 'Inserisci un anno di nascita valido.', tipo: 'errore' });
            return;
          }
        }
      }
    }

    const url = isLogin 
      ? `${import.meta.env.VITE_API_URL}/api/utenti/login` 
      : `${import.meta.env.VITE_API_URL}/api/utenti/registrazione`;
  
    let bodyData = {};
    if (isLogin) {
      bodyData = { email: formData.email, password: formData.password };
    } else {
      bodyData = { ...formData };
      if (bodyData.data_nascita === '') bodyData.data_nascita = null;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessaggio({ 
          testo: isLogin ? 'Accesso eseguito!' : 'Registrazione completata! Ora fai il login.', 
          tipo: 'successo' 
        });
        
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
      setMessaggio({ testo: 'Errore di connessione al server.', tipo: 'errore' });
    }
  };

  return (
    <div className="card">
      <h2 style={{ textAlign: 'center', color: '#93c47d' }}>
        {isLogin ? 'Accesso al Sistema' : 'Nuova Registrazione'}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#e5e5e7' }}>Email:</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required className="form-control" />
          </div>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#e5e5e7' }}>Password:</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                required 
                className="form-control" 
                style={{ paddingRight: '80px' }} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#93c47d', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px'
                }}
              >
                {showPassword ? 'Nascondi' : 'Mostra'}
              </button>
            </div>
          </div>
        </div>

        {!isLogin && (
          <>
            <div className="form-group" style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#e5e5e7' }}>Registrati come:</label>
              <select name="ruolo" value={formData.ruolo} onChange={handleChange} className="form-control">
                <option value="Paziente">Paziente</option>
                <option value="Medico">Medico Specialista</option>
              </select>
            </div>

            <hr style={{ margin: '20px 0', borderColor: 'rgba(255, 255, 255, 0.1)' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#e5e5e7' }}>Nome:</label>
                <input type="text" name="nome" value={formData.nome} onChange={handleChange} required className="form-control" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#e5e5e7' }}>Cognome:</label>
                <input type="text" name="cognome" value={formData.cognome} onChange={handleChange} required className="form-control" />
              </div>
            </div>

            {formData.ruolo === 'Paziente' && (
              <>
                <div className="form-group" style={{ marginTop: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#e5e5e7' }}>Codice Fiscale:</label>
                  <input type="text" name="codice_fiscale" value={formData.codice_fiscale} onChange={handleChange} required className="form-control" maxLength="16" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#e5e5e7' }}>Data Nascita:</label>
                    <input type="date" name="data_nascita" value={formData.data_nascita} onChange={handleChange} max={oggi} className="form-control" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#e5e5e7' }}>Telefono:</label>
                    <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="form-control" />
                  </div>
                </div>
              </>
            )}

            {formData.ruolo === 'Medico' && (
              <div className="form-group" style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#e5e5e7' }}>Specializzazione:</label>
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
          </>
        )}

        <button type="submit" className="btn-submit" style={{ marginTop: '25px', width: '100%' }}>
          {isLogin ? 'Accedi' : 'Completa Registrazione'}
        </button>
      </form>

      {messaggio.testo && (
        <div style={{ 
          marginTop: '15px', textAlign: 'center', 
          color: messaggio.tipo === 'successo' ? '#93c47d' : (messaggio.tipo === 'errore' ? '#ff453a' : '#a1a1aa'),
          fontSize: '0.9rem', fontWeight: 'bold'
        }}>
          {messaggio.testo}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button 
          type="button"
          onClick={() => { setIsLogin(!isLogin); setMessaggio({ testo: '', tipo: '' }); }} 
          style={{ background: 'none', border: 'none', color: '#93c47d', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
        >
          {isLogin ? "Nuovo utente? Crea un account" : "Hai già un account? Torna al login"}
        </button>
      </div>
    </div>
  );
}

export default AuthForm;