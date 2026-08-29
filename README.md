# Salus Medica

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-00a393?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-18.2-61dafb?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

---

## Descrizione del Progetto

**Salus Medica** è un'applicazione web full-stack sviluppata per digitalizzare la gestione operativa di un poliambulatorio. Il sistema permette di gestire in modo centralizzato le agende mediche, le prenotazioni dei pazienti, la refertazione clinica e il ciclo di fatturazione. L'obiettivo del progetto è fornire uno strumento pratico che riduca i tempi di amministrazione e faciliti l'accesso ai servizi sanitari, sostituendo i tradizionali sistemi basati su carta o gestionali locali.

---

## Architettura Tecnica

Il progetto adotta un'architettura a tre livelli (Three-Tier) disaccoppiata, per separare nettamente l'interfaccia utente dalla logica di business:

- **Frontend (Client):** Sviluppato come Single Page Application (SPA) utilizzando **React.js 18** e il bundler **Vite**. Comunica con il server in modo asincrono, aggiornando l'interfaccia senza ricaricare la pagina.
- **Backend (Server):** Implementato in **Python** tramite il framework **FastAPI**. Agisce da API Gateway RESTful *stateless*, ricevendo le richieste HTTP e restituendo i dati in formato JSON.
- **Database (Persistenza):** Gestito tramite **PostgreSQL** in cloud. L'interazione con il database avviene tramite l'ORM **SQLAlchemy**, che mappa le tabelle in classi e previene vulnerabilità come le SQL Injection.

---

## Funzionalità Principali

### Area Paziente
- **Prenotazione self-service:** Selezione del medico specialista e degli slot orari liberi, con disabilitazione in tempo reale degli orari già occupati.
- **Storico visite:** Accesso alla lista delle prenotazioni passate e future.
- **Gestione documenti:** Download immediato in formato PDF dei referti medici e delle fatture associate alle visite completate.
- **Dashboard contabile:** Visualizzazione del riepilogo delle prestazioni saldate e di quelle da pagare.

### Area Medico
- **Agenda clinica:** Visualizzazione della lista giornaliera dei pazienti in coda, organizzata per orario.
- **Anamnesi:** Consultazione dello storico clinico del paziente prima della visita.
- **Refertazione:** Interfaccia riservata per la compilazione e il salvataggio del referto medico al termine della prestazione.
- **KPI e Fatturato:** Cruscotto riepilogativo con il calcolo dei pazienti assistiti, dei referti emessi e del fatturato generato.

---

## Database e Integrità dei Dati

La base di dati è progettata per garantire l'integrità referenziale e prevenire la corruzione delle informazioni cliniche:
- **Isolamento dei domini (RBAC):** Lo schema isola le credenziali di accesso (tabella `utenti`) dalle anagrafiche specifiche (tabelle `pazienti` e `medici`), garantendo un controllo degli accessi basato sul ruolo.
- **Anti-Overbooking:** Per prevenire le *race condition* (doppie prenotazioni simultanee), il controllo degli slot liberi è demandato direttamente a vincoli transazionali sul database PostgreSQL.
- **Meccanismo di Fallback:** Per agevolare i test e lo sviluppo locale, il sistema rileva l'eventuale assenza delle credenziali cloud (Supabase) e commuta automaticamente la connessione su un database **SQLite** locale, garantendo la totale portabilità del progetto.
- **Validazione Payload:** Tutti i dati in ingresso dal frontend vengono validati rigorosamente tramite gli schemi **Pydantic** prima di essere processati.

---

## Progettazione e Modellazione

Gli schemi architetturali e i diagrammi di flusso realizzati in fase di analisi sono consultabili ai seguenti link:

- **Modello Relazionale:** [Schema E-R del Database (dbdiagram.io)](https://dbdiagram.io/d/69ae1019a44dc25f8b4642b7)
- **Struttura di Sistema:** [Diagramma delle Classi UML (Mermaid.js)](https://mermaid.ai/app/projects/ee9e3ad4-6f5a-4984-b5dd-1d1165a0e48d/diagrams/81e41291-2749-44e2-a4f6-ae4269c086d9/version/v0.1/edit?entryPoint=Share+link)
- **Flusso Backend:** [Diagramma di Sequenza Logica Transazioni (Mermaid.js)](https://mermaid.ai/app/projects/ee9e3ad4-6f5a-4984-b5dd-1d1165a0e48d/diagrams/26a62137-9a2d-4cea-9e20-eb915b5dd1d7/version/v0.1/edit?shouldShowPopup=true&entryPoint=Dashboard)

---

## Guida all'Installazione (Manuale)

Il progetto è suddiviso in due cartelle distinte: `backend` e `frontend`. Per far funzionare l'applicazione in locale, devi avviare entrambi i servizi in due terminali separati.

### 1. Avvio del Backend (FastAPI)
Apri un terminale, entra nella cartella del progetto e avvia il server Python:

```bash
cd backend

# Crea e attiva l'ambiente virtuale
python -m venv venv

# Su Windows:
venv\Scripts\activate
# Su macOS/Linux:
source venv/bin/activate

# Installa le librerie necessarie
pip install -r requirements.txt

# Avvia il server backend (sarà visibile sulla porta 8000)
uvicorn main:app --reload
```

### 2. Avvio del Frontend (React/Vite)
Apri un **nuovo** terminale, entra nella cartella del frontend e avvia l'interfaccia utente:

```bash
cd frontend

# Installa i pacchetti Node.js (necessario solo al primo avvio)
npm install

# Avvia il server di sviluppo (sarà visibile sulla porta 5173)
npm run dev
```

---

## Avvio Rapido Automatizzato (solo per macOS)

Per semplificare l'avvio ed evitare di dover aprire manualmente due terminali ogni volta, ho creato uno script Bash (`salus_medica.command`) nella cartella principale del progetto.

### Cosa fa lo script:
1. **Libera le porte:** Controlla se le porte 8000 e 5173 sono rimaste bloccate da un test precedente e le chiude.
2. **Avvia i server:** Attiva l'ambiente virtuale Python, avvia il backend in background e fa la stessa cosa per il frontend.
3. **Apre il browser:** Aspetta un paio di secondi per far caricare i server e poi apre in automatico il sito web su `http://localhost:5173`.
4. **Chiusura pulita:** Quando hai finito, ti basta premere `Ctrl+C` nel terminale: lo script intercetterà il comando e spegnerà correttamente sia il backend che il frontend in un colpo solo.

### Come usarlo:

Apri il terminale nella cartella principale del progetto e digita:

```bash
# 1. Dai i permessi di esecuzione al file (da fare solo la prima volta)
chmod +x salus_medica.command

# 2. Avvia lo script
./salus_medica.command
```

(Nota: dopo aver dato i permessi la prima volta, su macOS puoi avviare tutto semplicemente facendo **doppio click** sul file `salus_medica.command` direttamente dal Finder).

---

## Deployment e Risorse Cloud

Per facilitare la revisione del progetto, sono stati predisposti i seguenti punti di accesso alle risorse live:

| Risorsa | Piattaforma | Link Diretto |
| :--- | :--- | :--- |
| **Frontend Live** | GitHub | [Vai all'App](https://simonedelpapa.github.io/pw_salus_medica/) |
| **Documentazione API** | Swagger UI | [Esplora gli Endpoint](https://salus-medica-backend.onrender.com/docs) |
| **Database Console** | Supabase | [Gestione PostgreSQL](https://supabase.com/dashboard/project/ihyrcegrznmjlbbhavtx) |

---

## Credenziali di Accesso per Test

Per facilitare la fase di revisione dell'elaborato, il sistema è stato pre-popolato con account di test che riflettono i diversi livelli di autorizzazione previsti dalla logica di business.

### 1. Profilo Paziente

* **Paziente 1:** marco.esposito@email.it
* **Paziente 2:** sara.ricci@email.it
* **Paziente 3:** lorenzo.marino@email.it
* **Paziente 4:** chiara.greco@email.it
* **Paziente 5:** matteo.conti@email.it
* **Paziente 6:** simone.delpapa@email.it

**Password:** prova (valida per tutti i pazienti)

### 2. Profilo Medico

* **Medico 1:** mario.rossi@salus.it
* **Medico 2:** giulia.bianchi@salus.it
* **Medico 3:** luca.verdi@salus.it
* **Medico 4:** anna.neri@salus.it
* **Medico 5:** paolo.gialli@salus.it
* **Medico 6:** giovanni.giusti@salus.it
* **Medico 7:** mattia.duccini@salus.it
* **Medico 8:** andrea.delpapa@salus.it

**Password:** prova (valida per tutti i medici)
