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
    // Controllo incrociato su tutti i possibili nomi del campo ID
    const idRilevato = data.id_profilo || data.id_paziente || data.id_utente || data.id;
    
    console.log("ID RILEVATO AL LOGIN:", idRilevato); // Verifica in console!

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
    <div className="app-container" style={{ position: 'relative', minHeight: '100vh' }}>
      
      {/* ZONA UTENTE */}
      {utenteLoggato && (
        <div style={{
          position: 'absolute', top: '20px', right: '25px', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 10
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
            style={{ 
              backgroundColor: '#1c1c1e', color: '#ff453a', border: '1px solid #3a3a3c', 
              padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: '0.2s'
            }}
          >
            Esci
          </button>
        </div>
      )}

      {/* HEADER PRINCIPALE */}
      <header className="header" style={{ paddingTop: utenteLoggato ? '90px' : '40px', paddingBottom: '30px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '5px' }}>
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#93c47d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 4px 8px rgba(147, 196, 125, 0.4))' }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <h1 style={{ margin: 0, fontSize: '3rem', fontWeight: '900', background: 'linear-gradient(90deg, #93c47d, #57a639)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
            Salus Medica
          </h1>
        </div>
        <p style={{ color: '#a1a1aa', fontSize: '1.15rem', fontStyle: 'italic', letterSpacing: '1.5px', margin: 0, fontWeight: '300' }}>
          L'eccellenza medica a portata di click
        </p>
      </header>

      {/* CORPO CENTRALE CON SPAZIATURE UNIFORMI (gap: 20px) */}
      <main style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {!utenteLoggato ? (
          <div className="login-wrapper">
            <AuthForm onLoginSuccess={gestisciLogin} />
          </div>
        ) : (
          <>
            <Dashboard utente={utenteLoggato} />
            {/* Linea separatrice più elegante e integrata nella spaziatura */}
            <hr style={{ border: 'none', borderTop: '1px solid #3a3a3c', margin: '10px 0' }} />
            <MediciList />
          </>
        )}
      </main>
    </div>
  );
}

export default App;