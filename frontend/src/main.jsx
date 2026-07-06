/**
 * Entry point principale dell'applicazione React.
 * Si occupa di agganciare l'albero dei componenti React al DOM nativo del browser
 * e di inizializzare lo StrictMode per evidenziare potenziali problemi durante lo sviluppo.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Inizializza il rendering dell'applicazione all'interno dell'elemento root
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);