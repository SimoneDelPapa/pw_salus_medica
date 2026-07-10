# 🏥 Salus Medica — Clinical Management System

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-00a393?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-18.2-61dafb?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

---

### 📝 Descrizione del Progetto

**Salus Medica** è un ecosistema digitale full-stack *Enterprise-ready* progettato per la digitalizzazione e l'automazione dei flussi operativi, clinici e amministrativi di un poliambulatorio specialistico di medie dimensioni. 

L'applicazione adotta un'architettura a tre livelli logici e fisici (**Three-Tier Architecture**) completamente disaccoppiata. Il nucleo logico basato su API RESTful asincrone comunica nativamente con un'interfaccia utente reattiva che implementa il paradigma del *Glassmorphism* tramite fogli di stile CSS puri, ponendo la massima attenzione alla coerenza transazionale del dato e alla gestione della concorrenza.

---

## ✨ Funzionalità Core

| Area Funzionale | Descrizione Tecnica |
| :--- | :--- |
| **🔐 Controllo Accessi (RBAC)** | Autenticazione granulare con isolamento rigido dei profili relazionali (*Paziente* e *Medico*) e protezione middleware degli endpoint API. |
| **🎯 Flusso Master-Detail** | UI interattiva per la prenotazione: il paziente seleziona lo specialista tramite card visive e il sistema inietta dinamicamente il modulo di pianificazione filtrando gli slot liberi. |
| **🚫 Algoritmo Anti-Overbooking** | Validazione delle collisioni temporali delegata all'engine del DBMS tramite query SQL parametrizzate basate su estrazione cronologica assoluta. |
| **⚙️ Macchina a Stati (Lazy)** | Avanzamento automatico e atomico dello stato delle visite (da *In attesa* a *Confermata*) proiettato sul fuso orario italiano (`Europe/Rome`). |
| **💎 Integrità Transazionale** | L'aggiornamento della visita innesca la generazione sincrona di fattura e referto. L'uso di update atomici a livello SQL esclude la creazione di record orfani dovuto a *race condition*. |
| **🌐 Edge Document Generation** | Compilazione e formattazione vettoriale dei referti medici in formato PDF delegate interamente al browser dell'utente tramite `jsPDF`, azzerando il carico computazionale sul server. |
| **🧮 Onboarding Automatizzato** | Calcolo in tempo reale del Codice Fiscale sul client durante la registrazione e provisioning automatico della casella e-mail istituzionale per i medici. |

---

## 🛠️ Stack Tecnologico

### 🨅 Backend & Database
- **Runtime & Framework:** Python 3.10+ / FastAPI (Asincrono ASGI)
- **Data Modeling & Validation:** Pydantic (Data Transfer Objects)
- **Persistenza & Connessione:** SQLAlchemy ORM strutturato con pattern *Dependency Injection* per la gestione isolata del ciclo di vita delle sessioni.
- **RDBMS:** PostgreSQL (Supabase Cloud PaaS) con motore di fallback automatico su SQLite locale per ambienti *environment-agnostic*.

### 🨅 Frontend & UI/UX
- **Libreria Core:** React.js 18 (Compilato tramite Vite per Hot Module Replacement istantaneo)
- **Design System:** CSS3 Nativo (Approccio *Functional CSS* e layout responsivo per dispositivi mobili senza dipendenze o framework esterni)
- **Rendering Client-Side:** jsPDF

---

## 📂 Struttura del Repository

```text
pw_salus_medica/
├── backend/                 # Strato Logico di Business (FastAPI Gateway)
│   ├── main.py              # Entry point dell'applicazione, middleware e routing API
│   ├── database.py          # Configurazione engine, sessioni e Dependency Injection
│   ├── models.py            # Modelli ORM SQLAlchemy (Schema tabelle database)
│   ├── schemas.py           # Schemi Pydantic (Validazione semantica e contratti DTO)
│   ├── requirements.txt     # Manifest delle dipendenze e librerie Python
│   └── .env.example         # Template delle variabili d'ambiente server
├── frontend/                # Strato di Presentazione (Client React SPA)
│   ├── src/                 # Componenti sorgente dell'interfaccia (Dashboard, PrenotazioneForm, ecc.)
│   ├── package.json         # Gestione dei pacchetti e script Node.js
│   ├── vite.config.js       # Configurazione del bundler Vite
│   └── .env.example         # Template delle variabili d'ambiente client
└── .gitignore               # Esclusione globale dei file di build, cache e credenziali segrete
