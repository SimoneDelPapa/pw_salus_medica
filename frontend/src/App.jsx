import { useState, useEffect } from 'react';
import './App.css';
import AuthForm from './AuthForm';
import MediciList from './MediciList';
import PrenotazioneForm from './PrenotazioneForm';
import Dashboard from './Dashboard';

function App() {
  // 1. INIZIALIZZAZIONE INTELLIGENTE:
  // Quando la pagina si carica, React controlla prima se c'è qualcosa nel "cassetto" localStorage
  const [utenteLoggato, setUtenteLoggato] = useState(() => {
    const utenteSalvato = localStorage.getItem('utenteSalusMedica');
    // Se c'è, lo trasforma in oggetto e fa il login automatico. Altrimenti parte da null.
    return utenteSalvato ? JSON.parse(utenteSalvato) : null;
  });

  // 2. FUNZIONE DI LOGIN (Salva nel cassetto)
  const gestisciLogin = (data) => {
    const nuovoUtente = { id: data.id_profilo, ruolo: data.ruolo };
    setUtenteLoggato(nuovoUtente);
    // Salva i dati sotto forma di testo nel browser
    localStorage.setItem('utenteSalusMedica', JSON.stringify(nuovoUtente)); 
  };

  // 3. FUNZIONE DI LOGOUT (Svuota il cassetto)
  const gestisciLogout = () => {
    setUtenteLoggato(null);
    localStorage.removeItem('utenteSalusMedica'); // Cancella i dati dal browser
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Salus Medica</h1>
        <p>Sistema Avanzato di Prenotazione Visite</p>
      </header>

      <main>
        {/* Se l'utente non è loggato, mostra il Login */}
        {!utenteLoggato ? (
          <AuthForm onLoginSuccess={gestisciLogin} />
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#1d1d1f' }}>
                Accesso eseguito come: <strong>{utenteLoggato.ruolo}</strong>
              </h3>
              <button 
                onClick={gestisciLogout} 
                className="btn-submit" 
                style={{ width: 'auto', backgroundColor: '#ff3b30', marginTop: 0 }}
              >
                Logout
              </button>
            </div>
            
            <Dashboard utente={utenteLoggato} />
            
            <MediciList />
            
            {/* Mostra il form di prenotazione SOLO se chi è entrato è un Paziente! */}
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