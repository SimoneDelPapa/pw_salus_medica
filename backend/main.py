"""
API Gateway per Salus Medica.
Sviluppato con FastAPI, questo modulo espone i servizi backend per l'applicazione clinica.
Gestisce l'autenticazione tramite controllo degli accessi basato sui ruoli (RBAC),
la pianificazione delle agende mediche, le transizioni di stato delle visite
e il ciclo di vita dei documenti fiscali e clinici.
"""

import random
from datetime import datetime, time
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

import models
import schemas
import database
from database import engine
from schemas import LoginRequest
from zoneinfo import ZoneInfo

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Salus Medica API", version="1.3.8")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "https://simonedelpapa.github.io"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    """Endpoint di health check per verificare l'operatività del root di rete."""
    return {"status": "online", "message": "API Salus Medica operative."}


@app.get("/api/ping")
@app.head("/api/ping")
def mantieni_sveglio():
    """Endpoint di keep-alive per prevenire l'ibernazione delle istanze serverless in cloud."""
    return {"status": "ok", "messaggio": "Il server è sveglio e operativo!"}


def genera_fattura(db: Session, p: models.Prenotazione):
    """
    Funzione idempotente per la generazione automatica di una fattura.
    Implementa un controllo preliminare di esistenza per mitigare eventuali 
    race condition derivanti da chiamate asincrone concorrenti.
    
    Args:
        db (Session): La sessione attiva del database.
        p (models.Prenotazione): L'entità della prenotazione di riferimento.
    """
    esistente = db.query(models.Fattura).filter(models.Fattura.id_prenotazione == p.id_prenotazione).first()
    if esistente:
        return 
        
    nuova_fattura = models.Fattura(
        id_prenotazione=p.id_prenotazione,
        importo=float(p.importo) if p.importo else 0.0,
        data_emissione=p.data_visita,
        pagata="No"
    )
    db.add(nuova_fattura)
    try:
        db.commit()
    except Exception:
        db.rollback()


def genera_referto(db: Session, p: models.Prenotazione):
    """
    Inizializza un record vuoto per la refertazione clinica.
    Invocata esclusivamente al completamento temporale della visita medica.
    
    Args:
        db (Session): La sessione attiva del database.
        p (models.Prenotazione): L'entità della prenotazione di riferimento.
    """
    nuovo_referto = models.Referto(
        id_paziente=p.id_paziente,
        id_medico=p.id_medico,
        data_referto=p.data_visita,
        contenuto="In attesa di refertazione da parte del medico."
    )
    db.add(nuovo_referto)
    try:
        db.commit()
    except Exception:
        db.rollback()


def is_visita_passata(data_visita, ora_visita) -> bool:
    """
    Calcola se il timestamp di una specifica visita risulta antecedente all'orario attuale.
    Forza la computazione sul fuso orario 'Europe/Rome' per neutralizzare discrepanze UTC server-side.
    
    Args:
        data_visita (Date/String): La data programmata per l'appuntamento.
        ora_visita (Time/String): L'orario programmato per l'appuntamento.
        
    Returns:
        bool: True se la visita è nel passato, False altrimenti.
    """
    try:
        d_str = str(data_visita).split(" ")[0]
        o_str = str(ora_visita)[:5] if ora_visita else "00:00"
        visit_dt = datetime.strptime(f"{d_str} {o_str}", "%Y-%m-%d %H:%M")
        
        ora_attuale_italia = datetime.now(ZoneInfo("Europe/Rome")).replace(tzinfo=None)
        return ora_attuale_italia >= visit_dt
    except Exception:
        return False


def sincronizza_stato_visita(db: Session, p: models.Prenotazione) -> bool:
    """
    Esegue l'avanzamento della macchina a stati per le prenotazioni scadute temporaneamente.
    Utilizza un'istruzione SQL di UPDATE condizionale per garantire l'atomicità dell'operazione,
    prevenendo conflitti di concorrenza. Se la transizione avviene con successo, innesca 
    la generazione in cascata dei documenti clinici e contabili.
    
    Args:
        db (Session): La sessione attiva del database.
        p (models.Prenotazione): L'entità della prenotazione da valutare.
        
    Returns:
        bool: True se lo stato è stato effettivamente modificato dal thread corrente, False in caso contrario.
    """
    if p.stato == "In attesa" and is_visita_passata(p.data_visita, p.ora_visita):
        stmt = text("UPDATE prenotazioni SET stato = 'Confermata' WHERE id_prenotazione = :id AND stato = 'In attesa'")
        result = db.execute(stmt, {"id": p.id_prenotazione})
        db.commit()
        
        if result.rowcount > 0:
            db.refresh(p) 
            genera_fattura(db, p)
            genera_referto(db, p)
            return True
        else:
            db.refresh(p)
            return False
            
    return False


def check_is_pagata(valore_campo) -> bool:
    """
    Utility di normalizzazione dati.
    Converte le diverse rappresentazioni testuali del database in un booleano rigoroso.
    """
    return str(valore_campo).strip().lower() in ["si", "true", "1", "yes"]


@app.post("/api/utenti/registrazione", status_code=201)
def registra_utente(dati: schemas.UtenteRegistrazione, db: Session = Depends(database.get_db)):
    """
    Gestisce l'onboarding di nuovi utenti.
    Esegue la persistenza delle credenziali nel nodo radice 'Utenti' e propaga 
    le informazioni anagrafiche specifiche nel rispettivo profilo relazionale (Paziente o Medico).
    """
    if db.query(models.Utente).filter(models.Utente.email == dati.email).first():
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    nuovo_utente = models.Utente(email=dati.email, password_hash=f"{dati.password}hashed", ruolo=dati.ruolo)
    db.add(nuovo_utente)
    db.commit()
    db.refresh(nuovo_utente)

    if dati.ruolo == "Paziente":
        if not dati.codice_fiscale:
            raise HTTPException(status_code=400, detail="Codice Fiscale obbligatorio")
        nuovo_profilo = models.Paziente(
            id_utente=nuovo_utente.id_utente, nome=dati.nome, cognome=dati.cognome, 
            codice_fiscale=dati.codice_fiscale, telefono=dati.telefono, 
            data_nascita=dati.data_nascita, sesso=dati.sesso, luogo_nascita=dati.luogo_nascita
        )
    else:
        nuovo_profilo = models.Medico(
            id_utente=nuovo_utente.id_utente, nome=dati.nome, cognome=dati.cognome, 
            specializzazione=dati.specializzazione, codice_fiscale=dati.codice_fiscale, 
            telefono=dati.telefono, data_nascita=dati.data_nascita, sesso=dati.sesso, luogo_nascita=dati.luogo_nascita
        )
    db.add(nuovo_profilo)
    db.commit()
    return nuovo_utente


@app.post("/api/utenti/login")
def login_utente(credenziali: LoginRequest, db: Session = Depends(database.get_db)):
    """
    Risolve il processo di autenticazione validando le credenziali e assemblando 
    un payload combinato che espone l'identità dell'utente unita al suo profilo di dettaglio.
    """
    utente = db.query(models.Utente).filter(models.Utente.email == credenziali.email).first()
    if not utente or utente.password_hash != f"{credenziali.password}hashed":
        raise HTTPException(status_code=401, detail="Email o password errati")
    
    res = {"id_utente": utente.id_utente, "ruolo": utente.ruolo, "id_profilo": None, "nome": "", "cognome": ""}
    
    if utente.ruolo == "Paziente":
        p = db.query(models.Paziente).filter(models.Paziente.id_utente == utente.id_utente).first()
        if p: 
            res.update({"id_profilo": p.id_paziente, "nome": p.nome, "cognome": p.cognome, "telefono": getattr(p, "telefono", ""), "codice_fiscale": getattr(p, "codice_fiscale", ""), "sesso": getattr(p, "sesso", ""), "data_nascita": getattr(p, "data_nascita", ""), "luogo_nascita": getattr(p, "luogo_nascita", "")})
    else:
        m = db.query(models.Medico).filter(models.Medico.id_utente == utente.id_utente).first()
        if m: 
            res.update({"id_profilo": m.id_medico, "nome": m.nome, "cognome": m.cognome, "specializzazione": m.specializzazione, "telefono": getattr(m, "telefono", ""), "codice_fiscale": getattr(m, "codice_fiscale", ""), "sesso": getattr(m, "sesso", ""), "data_nascita": getattr(m, "data_nascita", ""), "luogo_nascita": getattr(m, "luogo_nascita", "")})
    return res


@app.put("/api/utenti/profilo/{ruolo}/{id_profilo}")
def aggiorna_profilo(ruolo: str, id_profilo: int, dati: dict, db: Session = Depends(database.get_db)):
    """
    Esegue l'aggiornamento parziale dei dati anagrafici per uno specifico ruolo utente.
    Gestisce la logica aziendale che rigenera dinamicamente l'indirizzo email di sistema 
    nel caso di mutazioni ai campi primari di identificazione (nome e cognome).
    """
    profilo = db.query(models.Paziente).filter(models.Paziente.id_paziente == id_profilo).first() if ruolo == "Paziente" else db.query(models.Medico).filter(models.Medico.id_medico == id_profilo).first()
    if not profilo: raise HTTPException(status_code=404, detail="Profilo non trovato")
    
    if ruolo == "Medico" and dati.get("data_nascita"):
        try:
            data_nascita_dt = datetime.strptime(dati["data_nascita"], "%Y-%m-%d").date()
            oggi = datetime.today().date()
            if oggi.year - data_nascita_dt.year - ((oggi.month, oggi.day) < (data_nascita_dt.month, data_nascita_dt.day)) < 18:
                raise HTTPException(status_code=400, detail="Il medico deve essere maggiorenne.")
        except ValueError:
            pass

    campi_da_ignorare = ["id", "id_paziente", "id_medico", "id_utente", "ruolo", "specializzazione"] if ruolo == "Paziente" else ["id", "id_paziente", "id_medico", "id_utente", "ruolo"]
    for key, value in dati.items():
        if key not in campi_da_ignorare and value is not None and hasattr(profilo, key): 
            setattr(profilo, key, value)
    
    utente = db.query(models.Utente).filter(models.Utente.id_utente == profilo.id_utente).first()
    nuova_email = utente.email if utente else ""
    
    if utente:
        email_calcolata = f"{profilo.nome.strip().lower().replace(' ', '')}.{profilo.cognome.strip().lower().replace(' ', '')}@{utente.email.split('@')[1] if '@' in utente.email else 'salus.it'}"
        if not db.query(models.Utente).filter(models.Utente.email == email_calcolata, models.Utente.id_utente != utente.id_utente).first():
            utente.email = nuova_email = email_calcolata

    db.commit()
    db.refresh(profilo)
    return {"message": "Profilo aggiornato", "nuova_email": nuova_email, "nuovo_cf": getattr(profilo, "codice_fiscale", "")}


@app.get("/api/medici")
def get_medici(db: Session = Depends(database.get_db)):
    """Restituisce la collezione integrale dei profili medici attivi per il routing degli appuntamenti."""
    return db.query(models.Medico).all()


@app.get("/api/medico/{id_medico}/pazienti")
def get_pazienti_medico(id_medico: int, db: Session = Depends(database.get_db)):
    """Estrae un dataset di pazienti univoci transitati storicamente nell'agenda di un determinato medico."""
    return db.query(models.Paziente).join(models.Prenotazione).filter(models.Prenotazione.id_medico == id_medico, models.Prenotazione.stato != "Annullata").distinct().all()


@app.get("/api/medico/paziente/{id_paziente}/dettagli")
def get_dettagli_paziente(id_paziente: int, id_medico: Optional[int] = None, db: Session = Depends(database.get_db)):
    """
    Raccoglie l'intera anamnesi degli appuntamenti e dello stato contabile per un paziente.
    Applica il lazy evaluation model, costringendo un ricalcolo dinamico degli stati 
    delle visite durante la fase di interrogazione.
    """
    query = db.query(models.Prenotazione).filter(models.Prenotazione.id_paziente == id_paziente, models.Prenotazione.stato != "Annullata")
    if id_medico: query = query.filter(models.Prenotazione.id_medico == id_medico)
        
    prenotazioni = query.order_by(models.Prenotazione.data_visita.desc()).all()
    risultato, salv_nec = [], False
    
    for p in prenotazioni:
        if sincronizza_stato_visita(db, p): salv_nec = True
        
        fattura = db.query(models.Fattura).filter(models.Fattura.id_prenotazione == p.id_prenotazione).first()
        medico = db.query(models.Medico).filter(models.Medico.id_medico == p.id_medico).first()
        
        importo_mostrato = float(fattura.importo) if fattura else (float(p.importo) if p.importo is not None else 0.0)
            
        risultato.append({
            "id_prenotazione": p.id_prenotazione,
            "data_visita": str(p.data_visita)[:10],
            "ora_visita": str(p.ora_visita)[:5] if p.ora_visita else "00:00",
            "motivo": p.motivo_visita,
            "stato": p.stato,
            "importo": importo_mostrato,
            "pagata": check_is_pagata(fattura.pagata) if fattura else False,
            "nome_medico": medico.nome if medico else "",
            "cognome_medico": medico.cognome if medico else "",
            "specializzazione_medico": medico.specializzazione if medico else "Specialistica",
            "codice_fiscale": getattr(p.paziente, "codice_fiscale", "") if p.paziente else "" 
        })
        
    if salv_nec: db.commit()
    return risultato


@app.get("/api/dashboard/medico/{id_medico}")
def get_dashboard_medico(id_medico: int, db: Session = Depends(database.get_db)):
    """Costruisce gli indicatori chiave di prestazione (KPI) finanziari e operativi per il profilo medico."""
    prenotazioni = db.query(models.Prenotazione).filter(
        models.Prenotazione.id_medico == id_medico, 
        models.Prenotazione.stato != "Annullata"
    ).all()
    
    fatturato, pazienti, referti, salv_nec = 0.0, set(), 0, False
    for p in prenotazioni:
        if sincronizza_stato_visita(db, p): salv_nec = True
        pazienti.add(p.id_paziente)
        if p.stato == "Confermata":
            referti += 1
            f = db.query(models.Fattura).filter(models.Fattura.id_prenotazione == p.id_prenotazione).first()
            if f and check_is_pagata(f.pagata): fatturato += f.importo
    if salv_nec: db.commit()
    return {"fatturato": float(fatturato), "numero_pazienti": len(pazienti), "numero_referti": referti}


@app.get("/api/dashboard/paziente/{id_paziente}")
def get_paziente_dashboard(id_paziente: int, db: Session = Depends(database.get_db)):
    """Elabora le statistiche di esposizione debitoria e i contatori di documentazione per il profilo paziente."""
    prenotazioni = db.query(models.Prenotazione).filter(models.Prenotazione.id_paziente == id_paziente, models.Prenotazione.stato != "Annullata").all()
    stats = {"fatture_pagate": 0.0, "fatture_da_pagare": 0.0, "referti_emessi": 0, "referti_da_emettere": 0}
    salv_nec = False
    
    for p in prenotazioni:
        if sincronizza_stato_visita(db, p): salv_nec = True
        if p.stato == "Confermata": stats["referti_emessi"] += 1
        else: stats["referti_da_emettere"] += 1
        
        f = db.query(models.Fattura).filter(models.Fattura.id_prenotazione == p.id_prenotazione).first()
        if f:
            if check_is_pagata(f.pagata): stats["fatture_pagate"] += float(f.importo)
            else: stats["fatture_da_pagare"] += float(f.importo) 
        else:
            if p.importo is not None:
                stats["fatture_da_pagare"] += float(p.importo)
            
    if salv_nec: db.commit()
    return stats


@app.get("/api/medico/{id_medico}/orari-occupati")
def get_orari_occupati(id_medico: int, data: str, db: Session = Depends(database.get_db)):
    """Fornisce una mappa cronologica degli slot allocati per implementare vincoli di UI nel calendario prenotazioni."""
    prenotazioni = db.query(models.Prenotazione).filter(models.Prenotazione.id_medico == id_medico, models.Prenotazione.stato != "Annullata").all()
    occupati = [str(p.ora_visita)[:5] for p in prenotazioni if str(p.data_visita)[:10] == data and p.ora_visita]
    return {"occupati": occupati}


@app.post("/api/prenotazioni", status_code=201)
def crea_prenotazione(prenotazione: schemas.PrenotazioneCreate, id_paziente: int, db: Session = Depends(database.get_db)):
    """
    Genera un nuovo record di prenotazione clinica.
    Implementa query parametrizzate pure in SQL per imporre vincoli architetturali 
    rigidi ed escludere categoricamente ogni forma di sovrapposizione oraria.
    """
    d_clean = str(prenotazione.data_visita).strip()[:10]
    o_clean = str(prenotazione.ora_visita).strip()[:5]
    
    try:
        ora_val = int(o_clean.split(":")[0])
        min_val = int(o_clean.split(":")[1])
    except:
        raise HTTPException(status_code=400, detail="Formato orario non valido.")

    try:
        query_conflitto = text("""
            SELECT id_prenotazione 
            FROM prenotazioni 
            WHERE id_medico = :medico 
            AND stato != 'Annullata' 
            AND data_visita = :data 
            AND EXTRACT(HOUR FROM ora_visita) = :ora 
            AND EXTRACT(MINUTE FROM ora_visita) = :minuto
        """)
        
        result = db.execute(query_conflitto, {
            "medico": prenotazione.id_medico, 
            "data": d_clean, 
            "ora": ora_val,
            "minuto": min_val
        })
        conflitto = result.fetchone()
        
        if conflitto:
            raise HTTPException(status_code=400, detail="Questo orario è già occupato.")

        prezzo_fissato = random.randint(50, 100)
        
        nuova_p = models.Prenotazione(
            id_paziente=id_paziente,
            id_medico=prenotazione.id_medico,
            data_visita=d_clean,
            ora_visita=o_clean,
            motivo_visita=prenotazione.motivo_visita,
            stato="In attesa",
            importo=prezzo_fissato
        )
        db.add(nuova_p)
        db.commit()
        db.refresh(nuova_p)
        
        return nuova_p

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/prenotazioni/{id_prenotazione}/paga")
def paga_prenotazione(id_prenotazione: int, db: Session = Depends(database.get_db)):
    """
    Esegue l'elaborazione fittizia del saldo contabile. Supporta workflow asincroni 
    generando l'entità 'Fattura' istantaneamente se il pagamento avviene anticipatamente 
    rispetto all'esecuzione clinica della prestazione.
    """
    p = db.query(models.Prenotazione).filter(models.Prenotazione.id_prenotazione == id_prenotazione).first()
    if not p: 
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")

    fattura = db.query(models.Fattura).filter(models.Fattura.id_prenotazione == id_prenotazione).first()
    
    if not fattura:
        fattura = models.Fattura(
            id_prenotazione=p.id_prenotazione,
            importo=float(p.importo) if p.importo is not None else 0.0,
            data_emissione=datetime.now().date(),
            pagata="Si"
        )
        db.add(fattura)
    else:
        fattura.pagata = "Si"
        
    db.commit()
    return {"message": "Pagamento confermato con successo"}


@app.put("/api/prenotazioni/{id_prenotazione}/annulla")
def annulla_prenotazione(id_prenotazione: int, db: Session = Depends(database.get_db)):
    """Muta lo stato di una prenotazione verificando preliminarmente le regole di consistenza temporale."""
    p = db.query(models.Prenotazione).filter(models.Prenotazione.id_prenotazione == id_prenotazione).first()
    if not p: raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    if p.stato == "Confermata": raise HTTPException(status_code=400, detail="Impossibile annullare una visita confermata.")
    p.stato = "Annullata"
    db.commit()
    return {"message": "Visita annullata"}