import { useState } from 'react';

function AuthForm({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  
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
  
    let bodyData = {};
    if (isLogin) {
      bodyData = { email: formData.email, password: formData.password };
    } else {
      bodyData = { ...formData };
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
        if (Array.isArray(data.detail)) {
          const campoErrato = data.detail[0].loc[data.detail[0].loc.length - 1];
          setMessaggio(`❌ Errore nel campo "${campoErrato}": controlla i dati inseriti.`);
        } else {
          setMessaggio(`❌ Errore: ${data.detail}`);
        }
      }
    } catch (error) {
      setMessaggio('❌ Errore di connessione al server.');
    }
  };

  return (
    /* Rimosso l'inline style che bloccava il restringimento */
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
            <input type="password" name="password" value={formData.password} onChange={handleChange} required className="form-control" />
          </div>
        </div>

        {!isLogin && (
          <>
            <div className="form-group" style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#e5e5e7' }}>Registrati come:</label>
              {/* Rimosso il background bianco per farlo adattare al Dark Mode */}
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
                    <input type="date" name="data_nascita" value={formData.data_nascita} onChange={handleChange} className="form-control" />
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
                <input type="text" name="specializzazione" value={formData.specializzazione} onChange={handleChange} required className="form-control" placeholder="es. Cardiologia..." />
              </div>
            )}
          </>
        )}

        <button type="submit" className="btn-submit" style={{ marginTop: '25px', width: '100%' }}>
          {isLogin ? 'Accedi' : 'Completa Registrazione'}
        </button>
      </form>

      {messaggio && (
        <div style={{ marginTop: '15px', textAlign: 'center', color: messaggio.includes('✅') ? '#93c47d' : '#ff453a' }}>
          {messaggio}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button 
          type="button"
          onClick={() => setIsLogin(!isLogin)} 
          style={{ background: 'none', border: 'none', color: '#93c47d', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
        >
          {isLogin ? "Nuovo utente? Crea un account" : "Hai già un account? Torna al login"}
        </button>
      </div>
    </div>
  );
}

export default AuthForm;