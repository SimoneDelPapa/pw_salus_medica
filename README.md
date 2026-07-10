# Salus Medica — Clinical Management System

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-00a393?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-18.2-61dafb?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

---

## Visione del Progetto

**Salus Medica** nasce per superare le inefficienze e la frammentazione informativa tipiche dei sistemi *legacy* monolitici ancora diffusi nel settore sanitario. Il progetto si configura come un ecosistema informativo integrato in grado di convertire l'atto clinico in un dato digitale permanente e sicuro, ottimizzando la sincronizzazione tra l'erogazione della prestazione, la refertazione medica e l'adempimento fiscale. L'obiettivo è minimizzare i tempi morti amministrativi e massimizzare la trasparenza per il paziente, centralizzando i flussi all'interno di un'unica piattaforma nativamente flessibile e orientata al futuro della sanità digitale (*e-Health*).

---

## Architettura Tecnica

Il sistema adotta un'architettura **Three-Tier** (a tre livelli logici e fisici) completamente disaccoppiata per garantire scalabilità, isolamento delle responsabilità ed efficienza manutentiva:

- **Presentation Layer (Frontend):** Sviluppato come Single Page Application (SPA) in **React.js 18** e inizializzato tramite **Vite**. Gestisce lo stato dell'interfaccia in modo reattivo, eliminando i ricaricamenti di pagina e offrendo un'esperienza d'uso fluida.
- **Application Layer (Backend):** Implementato in **Python** tramite il framework asincrono **FastAPI**. Agisce da API Gateway e orchestratore delle logiche di business tramite endpoint *stateless* e semantici che dialogano col client utilizzando lo standard JSON.
- **Data Layer (Persistenza):** Affidato a un database relazionale ottimizzato in cloud, interrogato mediante l'ORM SQLAlchemy con un'astrazione controllata basata sui contratti di validazione dell'applicazione.

---

## Funzionalità Principali

### Area Riservata Paziente
- **Flusso di Prenotazione Master-Detail:** Selezione immediata del medico specialista tramite card interattive e iniezione dinamica nel DOM del modulo di prenotazione con filtri real-time sugli slot orari disponibili.
- **Storico e Anamnesi Integrata:** Accesso centralizzato a tutte le prenotazioni passate, attuali e future, unito alla consultazione della propria storia clinica.
- **Riepilogo Finanziario:** Monitoraggio in tempo reale del proprio stato debitorio (prestazioni saldate vs prestazioni da pagare) e download immediato dei documenti fiscali.

### Area Riservata Medico
- **Agenda Digitale Cronologica:** Coda dei pazienti in attesa organizzata per data e ora per ottimizzare i flussi di lavoro giornalieri.
- **Cartella Clinica Elettronica:** Consultazione immediata dell'intera storia clinica del paziente selezionato (anamnesi, patologie pregresse, allergie).
- **Modulo di Refertazione:** Interfaccia dedicata alla compilazione del diario clinico a seguito dello svolgimento della prestazione.

---

## Infrastruttura e Database

La persistenza dei dati sfrutta un motore **PostgreSQL** ospitato sull'infrastruttura cloud di **Supabase**, garantendo la piena conformità ai principi ACID (Atomicità, Coerenza, Isolamento, Durabilità).
- **Normalizzazione in 3NF:** Lo schema relazionale è strutturato in Terza Forma Normale per eliminare ridondanze informative, isolando le credenziali di accesso (`utenti`) dalle tabelle anagrafiche di profilo (`pazienti` e `medici`).
- **Dependency Injection:** La gestione del ciclo di vita delle connessioni è governata nel codice da un pattern di iniezione delle dipendenze che istanzia sessioni isolate per ogni richiesta HTTP, azzerando il rischio di *memory leak*.
- **Fallback Database Configuration:** Il sistema è progettato per rilevare dinamicamente l'ambiente di runtime: commuta automaticamente su un motore SQLite locale in assenza di chiavi cloud, rendendo l'intero repository immediatamente portabile.

---

## Sicurezza e Integrità dei Dati

La sicurezza e l'inviolabilità del perimetro applicativo sono state poste al centro della progettazione logica:
- **Role-Based Access Control (RBAC):** Protezione middleware delle rotte e controllo granulare degli accessi basato sul ruolo utente verificato dal server.
- **Data Transfer Objects (DTO):** Implementazione di modelli di validazione rigorosi tramite **Pydantic** che fungono da dogana per i dati in ingresso, validando i payload prima di consentire l'interazione con il database.
- **Transazionalità e Anti-Race Condition:** La transizione di stato delle visite e la conseguente generazione di referti e fatture è governata da *Update Atomici* a basso livello SQL. Questo garantisce l'assoluta idempotenza dei processi, impedendo la duplicazione dei record a fronte di richieste asincrone parallele.
- **Calcolo Distribuito (Edge Processing):** Il calcolo algoritmico del Codice Fiscale in fase di registrazione e la generazione tipografica dei file PDF tramite la libreria `jsPDF` avvengono nel runtime JavaScript del browser del client, isolando i dati sensibili e riducendo il carico computazionale sul server.

---

## Progettazione e Modellazione

L'intera fase di analisi ingegneristica e lo studio del ciclo di vita del software sono consultabili e modificabili in tempo reale attraverso i seguenti link ai tool di modellazione utilizzati:

- **Modello Relazionale:** [Schema E-R del Database (dbdiagram.io)](https://dbdiagram.io/d/69ae1019a44dc25f8b4642b7)
- **Struttura di Sistema:** [Diagramma delle Classi UML (Mermaid.js)](https://mermaid.ai/app/projects/ee9e3ad4-6f5a-4984-b5dd-1d1165a0e48d/diagrams/81e41291-2749-44e2-a4f6-ae4269c086d9/version/v0.1/edit?entryPoint=Share+link)
- **Flusso Concorrenza:** [Diagramma di Sequenza UML - Logica Transazioni (Mermaid.js)](https://mermaid.ai/app/projects/ee9e3ad4-6f5a-4984-b5dd-1d1165a0e48d/diagrams/26a62137-9a2d-4cea-9e20-eb915b5dd1d7/version/v0.1/edit?shouldShowPopup=true&entryPoint=Dashboard)

---

## Guida all'Installazione

L'applicazione è suddivisa in due macro-servizi indipendenti. Configura ed esegui i componenti avviando due terminali separati.

### 1. Configurazione del Backend (FastAPI)
Naviga all'interno della cartella dedicata alla logica di business:
```bash
cd backend

# Inizializza l'ambiente virtuale di Python
python -m venv venv

# Attiva l'ambiente virtuale
# Su Windows (Prompt dei comandi):
venv\Scripts\activate
# Su macOS/Linux (Terminale):
source venv/bin/activate

# Installa i pacchetti e le dipendenze richieste
pip install -r requirements.txt
