import { useState } from 'react';
import './App.css';
import AuthForm from './AuthForm';
import MediciList from './MediciList';
import Dashboard from './Dashboard';

function App() {
  const [utenteLoggato, setUtenteLoggato] = useState(() => {
    const utenteSalvato = localStorage.getItem('utenteSalusMedica');
    return utenteSalvato ? JSON.parse(utenteSalvato) : null;
  });

  const gestisciLogin = (data) => {
    const idRilevato = data.id_profilo || data.id_paziente || data.id_utente || data.id;
    const nuovoUtente = { 
      id: idRilevato, 
      ruolo: data.ruolo,
      nome: data.nome, 
      cognome: data.cognome 
    };
    setUtenteLoggato(nuovoUtente);
    localStorage.setItem('utenteSalusMedica', JSON.stringify(nuovoUtente)); 
  };

  const gestisciLogout = () => {
    setUtenteLoggato(null);
    localStorage.removeItem('utenteSalusMedica'); 
  };

  return (
    <div className="app-container" style={{ position: 'relative', minHeight: '100vh', paddingBottom: '40px' }}>
      
      {/* ZONA UTENTE */}
      {utenteLoggato && (
        <div style={{
          /* Allontanato dai bordi estremi del browser */
          position: 'absolute', top: '30px', right: '30px', 
          display: 'flex', alignItems: 'center', gap: '15px', zIndex: 10
        }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', color: '#93c47d', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {utenteLoggato.ruolo}
            </span>
            <span style={{ display: 'block', fontSize: '1rem', color: '#e5e5e7', fontWeight: '600' }}>
              {utenteLoggato.nome ? `${utenteLoggato.nome} ${utenteLoggato.cognome}` : 'Utente Salus'}
            </span>
          </div>
          <button 
            onClick={gestisciLogout} 
            className="glass-button"
            style={{ 
              padding: '8px 15px', fontWeight: 'bold', fontSize: '0.85rem', color: '#ff453a', border: '1px solid rgba(255, 69, 58, 0.3)'
            }}
          >
            Esci
          </button>
        </div>
      )}

      {/* HEADER PRINCIPALE */}
      <header 
        className="header" 
        style={{ 
          position: 'relative', 
          /* Se loggato, spingiamo l'header a 110px di distanza dalla cima per saltare la zona utente! */
          marginTop: utenteLoggato ? '110px' : '30px',
          maxWidth: utenteLoggato ? '100%' : '420px',
          margin: utenteLoggato ? '110px auto 25px auto' : '30px auto 25px auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '2px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#93c47d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 2px 4px rgba(147, 196, 125, 0.3))' }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '900', color: '#93c47d', letterSpacing: '-0.5px' }}>
            Salus Medica
          </h1>
        </div>
        <p style={{ color: '#a1a1aa', fontSize: '0.95rem', fontStyle: 'italic', letterSpacing: '1px', margin: 0 }}>
          L'eccellenza medica a portata di click
        </p>
      </header>

      {/* CORPO CENTRALE */}
      <main style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {!utenteLoggato ? (
          <div className="login-wrapper">
            <AuthForm onLoginSuccess={gestisciLogin} />
          </div>
        ) : (
          <>
            <Dashboard utente={utenteLoggato} />
            {/* Linea separatrice */}
            <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.05)', margin: '0' }} />
            <MediciList />
          </>
        )}
      </main>
    </div>
  );
}

export default App;