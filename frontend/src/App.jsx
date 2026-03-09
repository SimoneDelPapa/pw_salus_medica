import { useState, useEffect } from 'react';
import './App.css';
import AuthForm from './AuthForm';
import MediciList from './MediciList';
import PrenotazioneForm from './PrenotazioneForm';
import Dashboard from './Dashboard';

function App() {
  const [utenteLoggato, setUtenteLoggato] = useState(() => {
    const utenteSalvato = localStorage.getItem('utenteSalusMedica');
    return utenteSalvato ? JSON.parse(utenteSalvato) : null;
  });

  const gestisciLogin = (data) => {
    const nuovoUtente = { id: data.id_profilo, ruolo: data.ruolo };
    setUtenteLoggato(nuovoUtente);
    localStorage.setItem('utenteSalusMedica', JSON.stringify(nuovoUtente)); 
  };

  const gestisciLogout = () => {
    setUtenteLoggato(null);
    localStorage.removeItem('utenteSalusMedica'); 
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Salus Medica</h1>
        <p>Sistema Avanzato di Prenotazione Visite</p>
      </header>

      <main style={{ width: '100%' }}>
        {!utenteLoggato ? (
          /* ECCO LA MAGIA: Inserendo AuthForm qui dentro, diventa stretto e centrato! */
          <div className="login-wrapper">
            <AuthForm onLoginSuccess={gestisciLogin} />
          </div>
        ) : (
          <>
            <div className="user-menu">
              <h3>
                Accesso eseguito come: <strong style={{color: '#93c47d'}}>{utenteLoggato.ruolo}</strong>
              </h3>
              <button 
                onClick={gestisciLogout} 
                className="btn-submit" 
                style={{ width: 'auto', backgroundColor: '#ff453a', color: 'white', padding: '10px 30px' }}
              >
                Logout
              </button>
            </div>
            
            <Dashboard utente={utenteLoggato} />
            <MediciList />
            
            {utenteLoggato.ruolo === 'Paziente' && (
              <PrenotazioneForm idPaziente={utenteLoggato.id} /> 
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;