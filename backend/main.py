from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import random

import models
import schemas
from database import engine, SessionLocal

# Crea le tabelle nel database (se non esistono)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API Salus Medica",
    description="API per il sistema di prenotazione visite mediche",
    version="1.0.0"
)

# Configurazione CORS per comunicare con React (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://pw-salus-medica.netlify.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency per il Database
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# ENDPOINT: Registrazione Utente
# ==========================================
@app.post("/api/utenti/registrazione", response_model=schemas.UtenteResponse, status_code=201)
def registra_utente(dati: schemas.UtenteRegistrazione, db: Session = Depends(get_db)):
    if db.query(models.Utente).filter(models.Utente.email == dati.email).first():
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    nuovo_utente = models.Utente(
        email=dati.email, 
        password_hash=dati.password + "hashed", 
        ruolo=dati.ruolo
    )
    db.add(nuovo_utente)
    db.commit()
    db.refresh(nuovo_utente)

    if dati.ruolo == "Paziente":
        if not dati.codice_fiscale:
            raise HTTPException(status_code=400, detail="Codice Fiscale obbligatorio")
        nuovo_paziente = models.Paziente(
            id_utente=nuovo_utente.id_utente,
            nome=dati.nome,
            cognome=dati.cognome,
            codice_fiscale=dati.codice_fiscale,
            telefono=dati.telefono,
            data_nascita=dati.data_nascita
        )
        db.add(nuovo_paziente)
    elif dati.ruolo == "Medico":
        nuovo_medico = models.Medico(
            id_utente=nuovo_utente.id_utente,
            nome=dati.nome,
            cognome=dati.cognome,
            specializzazione=dati.specializzazione
        )
        db.add(nuovo_medico)

    db.commit()
    return nuovo_utente

# ==========================================
# ENDPOINT: Login
# ==========================================
class LoginSchema(BaseModel):
    email: str
    password: str

@app.post("/api/utenti/login")
def login_utente(credenziali: LoginSchema, db: Session = Depends(get_db)):
    utente = db.query(models.Utente).filter(models.Utente.email == credenziali.email).first()
    if not utente or utente.password_hash != credenziali.password + "hashed":
        raise HTTPException(status_code=401, detail="Email o password errati")
    
    res = {"id_utente": utente.id_utente, "ruolo": utente.ruolo, "id_profilo": None, "nome": "", "cognome": ""}
    
    if utente.ruolo == "Paziente":
        p = db.query(models.Paziente).filter(models.Paziente.id_utente == utente.id_utente).first()
        if p: res.update({"id_profilo": p.id_paziente, "nome": p.nome, "cognome": p.cognome})
    else:
        m = db.query(models.Medico).filter(models.Medico.id_utente == utente.id_utente).first()
        if m: res.update({"id_profilo": m.id_medico, "nome": m.nome, "cognome": m.cognome})
        
    return res

# ==========================================
# ENDPOINT: Lista Medici (Per il Form di Prenotazione)
# ==========================================
@app.get("/api/medici", response_model=list[schemas.MedicoResponse])
def get_medici(db: Session = Depends(get_db)):
    return db.query(models.Medico).all()

# ==========================================
# ENDPOINT: Creazione Prenotazione 
# (Nasce "In Attesa" e con fattura non pagata)
# ==========================================
@app.post("/api/prenotazioni", response_model=schemas.PrenotazioneResponse, status_code=201)
def crea_prenotazione(prenotazione: schemas.PrenotazioneCreate, id_paziente: int, db: Session = Depends(get_db)):
    adesso = datetime.now()
    momento_prenotato = datetime.combine(prenotazione.data_visita, prenotazione.ora_visita)
    
    if momento_prenotato < adesso:
        raise HTTPException(status_code=400, detail="Impossibile prenotare nel passato.")

    medico = db.query(models.Medico).filter(models.Medico.id_medico == prenotazione.id_medico).first()
    if not medico: raise HTTPException(status_code=404, detail="Medico non trovato")

    nuova_prenotazione = models.Prenotazione(
        id_paziente=id_paziente,
        id_medico=prenotazione.id_medico,
        data_visita=prenotazione.data_visita,
        ora_visita=prenotazione.ora_visita,
        motivo_visita=prenotazione.motivo_visita,
        stato="In attesa" # Nasce sempre in attesa
    )
    db.add(nuova_prenotazione)
    db.commit()
    db.refresh(nuova_prenotazione)
    
    # Creazione automatica del Referto (bozza)
    nuovo_referto = models.Referto(
        id_paziente=id_paziente,
        id_medico=prenotazione.id_medico,
        data_referto=prenotazione.data_visita,
        contenuto=f"REFERTO VISITA\n\nMedico: Dr. {medico.cognome}\nData: {prenotazione.data_visita}\nNote: Referto in compilazione, visita non ancora effettuata."
    )
    db.add(nuovo_referto)

    # Creazione automatica della Fattura (da pagare)
    nuova_fattura = models.Fattura(
        id_prenotazione=nuova_prenotazione.id_prenotazione,
        importo=round(random.uniform(30.0, 60.0), 2),
        data_emissione=prenotazione.data_visita,
        pagata="No" # Non pagata finché la visita non avviene
    )
    db.add(nuova_fattura)
    db.commit()
    
    return nuova_prenotazione

# ==========================================
# ENDPOINT: Dettagli Paziente (Storico Visite)
# Supporta la query string facoltativa ?id_medico=X
# ==========================================
@app.get("/api/medico/paziente/{id_paziente}/dettagli")
def get_dettagli_paziente(
    id_paziente: int, 
    id_medico: Optional[int] = None, # Reso opzionale per non rompere il frontend
    db: Session = Depends(get_db)
):
    # Query base: tutte le prenotazioni del paziente con un JOIN sulle fatture
    query = db.query(
        models.Prenotazione,
        models.Fattura.importo
    ).outerjoin(
        models.Fattura, 
        models.Fattura.id_prenotazione == models.Prenotazione.id_prenotazione
    ).filter(
        models.Prenotazione.id_paziente == id_paziente
    )

    # Se viene passato l'ID del medico, filtriamo (Privacy)
    if id_medico:
        query = query.filter(models.Prenotazione.id_medico == id_medico)

    dettagli = query.order_by(models.Prenotazione.data_visita.desc()).all()

    risultato = []
    adesso = datetime.now()

    for p, importo in dettagli:
        # Controllo temporale dinamico dello stato
        data_ora_visita = datetime.combine(p.data_visita, p.ora_visita)
        is_passata = adesso > data_ora_visita
        
        risultato.append({
            "id_prenotazione": p.id_prenotazione,
            "data_visita": p.data_visita.strftime("%Y-%m-%d"),
            "ora_visita": p.ora_visita.strftime("%H:%M:%S"),
            "motivo": p.motivo_visita,
            "stato": "Confermata" if is_passata else "In attesa",
            "importo": float(importo) if importo else 0.0,
            "nome_medico": p.medico.nome if p.medico else "",
            "cognome_medico": p.medico.cognome if p.medico else ""
        })

    return risultato

# ==========================================
# ENDPOINT: Lista Pazienti del Medico
# ==========================================
@app.get("/api/medico/{id_medico}/pazienti")
def get_pazienti_medico(id_medico: int, db: Session = Depends(get_db)):
    # Restituisce i pazienti unici che hanno almeno una prenotazione con questo medico
    return db.query(models.Paziente).join(models.Prenotazione).filter(models.Prenotazione.id_medico == id_medico).distinct().all()

# ==========================================
# ENDPOINT: Dashboard Medico (Statistiche)
# Calcola il fatturato solo sulle visite già avvenute!
# ==========================================
@app.get("/api/dashboard/medico/{id_medico}")
def get_dashboard_medico(id_medico: int, db: Session = Depends(get_db)):
    prenotazioni = db.query(models.Prenotazione).filter(models.Prenotazione.id_medico == id_medico).all()
    
    adesso = datetime.now()
    fatturato = 0.0
    pazienti_unici = set()
    
    for p in prenotazioni:
        data_ora_visita = datetime.combine(p.data_visita, p.ora_visita)
        
        # Conteggia SOLO se la visita è nel passato (quindi "Confermata")
        if adesso > data_ora_visita:
            pazienti_unici.add(p.id_paziente)
            
            fattura = db.query(models.Fattura).filter(models.Fattura.id_prenotazione == p.id_prenotazione).first()
            if fattura:
                fatturato += fattura.importo

    # Conteggio referti emessi (fino a data odierna)
    oggi = adesso.date()
    referti_count = db.query(models.Referto).filter(
        models.Referto.id_medico == id_medico,
        models.Referto.data_referto <= oggi
    ).count()

    return {
        "fatturato": float(fatturato),
        "numero_pazienti": len(pazienti_unici),
        "numero_referti": referti_count
    }