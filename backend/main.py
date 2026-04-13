import random
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
import schemas
import database
from database import engine

# Sincronizzazione tabelle DB
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Salus Medica API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginSchema(BaseModel):
    email: str
    password: str

# =============================================================================
# HELPER FUNCTION: PARSING SICURO DELLE DATE
# =============================================================================
def is_visita_passata(data_visita, ora_visita) -> bool:
    """
    Calcola in modo sicuro se una visita è nel passato.
    Previene bug di formattazione convertendo i tipi di SQLite in stringhe rigide.
    """
    try:
        d_str = str(data_visita).split(" ")[0]  # Forza formato YYYY-MM-DD
        o_str = str(ora_visita) if ora_visita else "00:00:00"
        o_str = o_str[:5]  # Forza formato HH:MM
        
        visit_dt = datetime.strptime(f"{d_str} {o_str}", "%Y-%m-%d %H:%M")
        return datetime.now() >= visit_dt
    except Exception as e:
        print(f"Errore lettura data dal DB: {e}")
        return False

# --- ENDPOINT UTENTI ---

@app.post("/api/utenti/registrazione", response_model=schemas.UtenteResponse, status_code=201)
def registra_utente(dati: schemas.UtenteRegistrazione, db: Session = Depends(database.get_db)):
    """Gestisce la creazione di un nuovo utente e del relativo profilo (Medico/Paziente)."""
    if db.query(models.Utente).filter(models.Utente.email == dati.email).first():
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    nuovo_utente = models.Utente(
        email=dati.email, 
        password_hash=f"{dati.password}hashed", 
        ruolo=dati.ruolo
    )
    db.add(nuovo_utente)
    db.commit()
    db.refresh(nuovo_utente)

    if dati.ruolo == "Paziente":
        if not dati.codice_fiscale:
            raise HTTPException(status_code=400, detail="Codice Fiscale obbligatorio")
        nuovo_profilo = models.Paziente(
            id_utente=nuovo_utente.id_utente,
            nome=dati.nome,
            cognome=dati.cognome,
            codice_fiscale=dati.codice_fiscale,
            telefono=dati.telefono,
            data_nascita=dati.data_nascita
        )
        db.add(nuovo_profilo)
    elif dati.ruolo == "Medico":
        nuovo_profilo = models.Medico(
            id_utente=nuovo_utente.id_utente,
            nome=dati.nome,
            cognome=dati.cognome,
            specializzazione=dati.specializzazione
        )
        db.add(nuovo_profilo)

    db.commit()
    return nuovo_utente

@app.post("/api/utenti/login")
def login_utente(credenziali: LoginSchema, db: Session = Depends(database.get_db)):
    """Verifica credenziali e restituisce i dati di sessione."""
    utente = db.query(models.Utente).filter(models.Utente.email == credenziali.email).first()
    if not utente or utente.password_hash != f"{credenziali.password}hashed":
        raise HTTPException(status_code=401, detail="Email o password errati")
    
    res = {"id_utente": utente.id_utente, "ruolo": utente.ruolo, "id_profilo": None, "nome": "", "cognome": ""}
    
    if utente.ruolo == "Paziente":
        p = db.query(models.Paziente).filter(models.Paziente.id_utente == utente.id_utente).first()
        if p: res.update({"id_profilo": p.id_paziente, "nome": p.nome, "cognome": p.cognome})
    else:
        m = db.query(models.Medico).filter(models.Medico.id_utente == utente.id_utente).first()
        if m: res.update({"id_profilo": m.id_medico, "nome": m.nome, "cognome": m.cognome})
        
    return res

# --- ENDPOINT CLINICI ---

@app.get("/api/medici", response_model=List[schemas.MedicoResponse])
def get_medici(db: Session = Depends(database.get_db)):
    return db.query(models.Medico).all()

@app.post("/api/prenotazioni", response_model=schemas.PrenotazioneResponse, status_code=201)
def crea_prenotazione(prenotazione: schemas.PrenotazioneCreate, id_paziente: int, db: Session = Depends(database.get_db)):
    """Registra una prenotazione e genera automaticamente fattura e bozza referto."""
    adesso = datetime.now()
    visita_dt = datetime.combine(prenotazione.data_visita, prenotazione.ora_visita)
    
    if visita_dt < adesso:
        raise HTTPException(status_code=400, detail="Impossibile prenotare nel passato.")

    medico = db.query(models.Medico).filter(models.Medico.id_medico == prenotazione.id_medico).first()
    if not medico: raise HTTPException(status_code=404, detail="Medico non trovato")

    nuova_prenotazione = models.Prenotazione(
        id_paziente=id_paziente,
        id_medico=prenotazione.id_medico,
        data_visita=prenotazione.data_visita,
        ora_visita=prenotazione.ora_visita,
        motivo_visita=prenotazione.motivo_visita,
        stato="In attesa"
    )
    db.add(nuova_prenotazione)
    db.commit()
    db.refresh(nuova_prenotazione)
    
    # Bozza Referto
    nuovo_referto = models.Referto(
        id_paziente=id_paziente, id_medico=prenotazione.id_medico,
        data_referto=prenotazione.data_visita, contenuto="..."
    )
    db.add(nuovo_referto)

    # Fatturazione
    nuova_fattura = models.Fattura(
        id_prenotazione=nuova_prenotazione.id_prenotazione,
        importo=round(random.uniform(50.0, 100.0), 2),
        data_emissione=prenotazione.data_visita, pagata="No"
    )
    db.add(nuova_fattura)
    db.commit()
    
    return nuova_prenotazione

@app.get("/api/medico/paziente/{id_paziente}/dettagli")
def get_dettagli_paziente(id_paziente: int, id_medico: Optional[int] = None, db: Session = Depends(database.get_db)):
    """Ritorna lo storico visite/fatture filtrato per paziente e opzionalmente per medico."""
    query = db.query(models.Prenotazione, models.Fattura.importo).outerjoin(
        models.Fattura, models.Fattura.id_prenotazione == models.Prenotazione.id_prenotazione
    ).filter(models.Prenotazione.id_paziente == id_paziente)

    if id_medico:
        query = query.filter(models.Prenotazione.id_medico == id_medico)

    registri = query.order_by(models.Prenotazione.data_visita.desc()).all()
    risultato = []

    for p, importo in registri:
        # Utilizza la funzione corazzata
        is_passata = is_visita_passata(p.data_visita, p.ora_visita)
        
        risultato.append({
            "id_prenotazione": p.id_prenotazione,
            "data_visita": str(p.data_visita)[:10],  # Sicuro per stringhe o date
            "ora_visita": str(p.ora_visita)[:5] if p.ora_visita else "00:00",
            "motivo": p.motivo_visita,
            "stato": "Confermata" if is_passata else "In attesa",
            "importo": float(importo) if importo else 0.0,
            "nome_medico": p.medico.nome if p.medico else "",
            "cognome_medico": p.medico.cognome if p.medico else ""
        })

    return risultato

@app.get("/api/medico/{id_medico}/pazienti")
def get_pazienti_medico(id_medico: int, db: Session = Depends(database.get_db)):
    return db.query(models.Paziente).join(models.Prenotazione).filter(models.Prenotazione.id_medico == id_medico).distinct().all()

# --- ANALYTICS DASHBOARD ---

@app.get("/api/dashboard/medico/{id_medico}")
def get_dashboard_medico(id_medico: int, db: Session = Depends(database.get_db)):
    """
    Riepilogo performance medico basato sulle prestazioni effettivamente erogate.
    """
    prenotazioni = db.query(models.Prenotazione).filter(models.Prenotazione.id_medico == id_medico).all()
    
    fatturato_reale = 0.0
    pazienti_totali = set()
    referti_conclusi = 0
    
    for p in prenotazioni:
        # Utilizza la funzione corazzata
        is_conclusa = is_visita_passata(p.data_visita, p.ora_visita)
        
        if is_conclusa:
            pazienti_totali.add(p.id_paziente)
            referti_conclusi += 1
            
            fattura = db.query(models.Fattura).filter(models.Fattura.id_prenotazione == p.id_prenotazione).first()
            if fattura:
                fatturato_reale += fattura.importo

    return {
        "fatturato": float(fatturato_reale),
        "numero_pazienti": len(pazienti_totali),
        "numero_referti": referti_conclusi
    }

@app.get("/api/dashboard/paziente/{id_paziente}", response_model=schemas.PazienteStats)
def get_paziente_dashboard(id_paziente: int, db: Session = Depends(database.get_db)):
    """
    Sincronizza le statistiche finanziarie con la disponibilità dei referti.
    Una visita è considerata 'Pagata' non appena scatta l'ora del download.
    """
    prenotazioni = db.query(models.Prenotazione).filter(models.Prenotazione.id_paziente == id_paziente).all()
    
    stats = {
        "fatture_pagate": 0.0,
        "fatture_da_pagare": 0.0,
        "referti_emessi": 0,
        "referti_da_emettere": 0
    }
    
    for p in prenotazioni:
        # Utilizza la funzione corazzata: LOGICA MIRROR
        is_scaricabile = is_visita_passata(p.data_visita, p.ora_visita)
        
        if is_scaricabile:
            stats["referti_emessi"] += 1
        else:
            stats["referti_da_emettere"] += 1
            
        fattura = db.query(models.Fattura).filter(models.Fattura.id_prenotazione == p.id_prenotazione).first()
        if fattura:
            if is_scaricabile:
                stats["fatture_pagate"] += fattura.importo
            else:
                stats["fatture_da_pagare"] += fattura.importo

    return stats