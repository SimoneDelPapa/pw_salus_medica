import { useState } from 'react';

function AuthForm({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  
  // Abbiamo aggiunto tutti i campi necessari allo stato iniziale
  const [formData, setFormData] = useState({ 
    email: '', password: '', ruolo: 'Paziente',
    nome: '', cognome: '', codice_fiscale: '', telefono: '', data_nascita: '', specializzazione: ''
  });
  const [messaggio, setMessaggio] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessaggio('Attendere...');

    const url = isLogin 
  ? `${import.meta.env.VITE_API_URL}/api/utenti/login` 
  : `${import.meta.env.VITE_API_URL}/api/utenti/registrazione`;
  
    // Prepariamo i dati da inviare
    let bodyData = {};
    if (isLogin) {
      bodyData = { email: formData.email, password: formData.password };
    } else {
      bodyData = { ...formData };
      // Trucco fondamentale: Python (FastAPI) va in errore se riceve una stringa vuota "" per un campo Date. 
      // Quindi la trasformiamo in 'null' se l'utente non l'ha compilata!
      if (bodyData.data_nascita === '') {
        bodyData.data_nascita = null;
      }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessaggio(isLogin ? '✅ Accesso eseguito!' : '✅ Registrazione completata! Ora fai il login.');
        if (isLogin) {
          setTimeout(() => onLoginSuccess(data), 1000); 
        } else {
          setTimeout(() => setIsLogin(true), 1500);
        }
      } else {
        // NOVITÀ: Gestiamo correttamente se l'errore è un array (errore di validazione di FastAPI)
        if (Array.isArray(data.detail)) {
          // Estrapoliamo quale campo ha generato l'errore
          const campoErrato = data.detail[0].loc[data.detail[0].loc.length - 1];
          setMessaggio(`❌ Errore nel campo "${campoErrato}": controlla i dati inseriti.`);
        } else {
          // Se è un nostro errore personalizzato (es. "Email già registrata")
          setMessaggio(`❌ Errore: ${data.detail}`);
        }
      }
    } catch (error) {
      setMessaggio('❌ Errore di connessione al server.');
    }
  };

  return (
    <div className="card" style={{ maxWidth: '500px', margin: '40px auto' }}>
      <h2 style={{ textAlign: 'center', color: '#0056b3' }}>
        {isLogin ? 'Accesso al Sistema' : 'Nuova Registrazione'}
      </h2>
      
      <form onSubmit={handleSubmit}>
        {/* Campi sempre visibili (Email e Password) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label>Email:</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required className="form-control" />
          </div>
          <div className="form-group">
            <label>Password:</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required className="form-control" />
          </div>
        </div>

        {/* Campi Dinamici (Visibili solo in fase di registrazione) */}
        {!isLogin && (
          <>
            <div className="form-group" style={{ marginTop: '15px' }}>
              <label>Registrati come:</label>
              <select name="ruolo" value={formData.ruolo} onChange={handleChange} className="form-control" style={{ backgroundColor: '#f8fafc' }}>
                <option value="Paziente">Paziente</option>
                <option value="Medico">Medico Specialista</option>
              </select>
            </div>

            <hr style={{ margin: '20px 0', borderColor: '#e2e8f0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>Nome:</label>
                <input type="text" name="nome" value={formData.nome} onChange={handleChange} required className="form-control" />
              </div>
              <div className="form-group">
                <label>Cognome:</label>
                <input type="text" name="cognome" value={formData.cognome} onChange={handleChange} required className="form-control" />
              </div>
            </div>

            {/* Campi esclusivi per il Paziente */}
            {formData.ruolo === 'Paziente' && (
              <>
                <div className="form-group">
                  <label>Codice Fiscale:</label>
                  <input type="text" name="codice_fiscale" value={formData.codice_fiscale} onChange={handleChange} required className="form-control" maxLength="16" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label>Data di Nascita:</label>
                    <input type="date" name="data_nascita" value={formData.data_nascita} onChange={handleChange} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Telefono:</label>
                    <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="form-control" />
                  </div>
                </div>
              </>
            )}

            {/* Campi esclusivi per il Medico */}
            {formData.ruolo === 'Medico' && (
              <div className="form-group">
                <label>Specializzazione Clinica:</label>
                <input type="text" name="specializzazione" value={formData.specializzazione} onChange={handleChange} required className="form-control" placeholder="es. Cardiologia, Dermatologia..." />
              </div>
            )}
          </>
        )}

        <button type="submit" className="btn-submit" style={{ marginTop: '25px' }}>
          {isLogin ? 'Accedi' : 'Completa Registrazione'}
        </button>
      </form>

      {messaggio && (
        <div className={messaggio.includes('✅') ? 'alert-success' : 'alert-error'}>
          {messaggio}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button 
          type="button"
          onClick={() => setIsLogin(!isLogin)} 
          style={{ background: 'none', border: 'none', color: '#0056b3', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
        >
          {isLogin ? "Nuovo utente? Crea un account" : "Hai già un account? Torna al login"}
        </button>
      </div>
    </div>
  );
}

export default AuthForm;