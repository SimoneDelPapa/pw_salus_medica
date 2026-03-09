from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
import random
from fastapi import FastAPI, Depends, HTTPException


import models
import schemas
from database import engine, SessionLocal

# Crea le tabelle nel database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API Salus Medica",
    description="API per il sistema di prenotazione visite mediche",
    version="1.0.0"
)

# Permette a React di chiamare le API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",          # Per i tuoi test locali
        "https://pw-salus-medica.netlify.app"    # L'indirizzo che ti ha dato Netlify
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Funzione per ottenere la sessione del database
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# ENDPOINT: Registrazione Utente Completa
# ==========================================
@app.post("/api/utenti/registrazione", response_model=schemas.UtenteResponse, status_code=201)
def registra_utente(dati: schemas.UtenteRegistrazione, db: Session = Depends(get_db)):
    # 1. Controlliamo se l'email esiste già
    if db.query(models.Utente).filter(models.Utente.email == dati.email).first():
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    # 2. Creiamo le credenziali di accesso base
    nuovo_utente = models.Utente(
        email=dati.email, 
        password_hash=dati.password + "hashed", 
        ruolo=dati.ruolo
    )
    db.add(nuovo_utente)
    db.commit()
    db.refresh(nuovo_utente)

    # 3. Logica Condizionale: salviamo i profili reali con validazione
    if dati.ruolo == "Paziente":
        if not dati.codice_fiscale:
            raise HTTPException(status_code=400, detail="Codice Fiscale obbligatorio per i pazienti")
            
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
        if not dati.specializzazione:
            raise HTTPException(status_code=400, detail="Specializzazione obbligatoria per i medici")
            
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
# ENDPOINT: Lettura Lista Medici
# ==========================================
@app.get("/api/medici", response_model=list[schemas.MedicoResponse])
def get_medici(db: Session = Depends(get_db)):
    # Interroghiamo il database per ottenere tutti i record della tabella Medici
    medici = db.query(models.Medico).all()
    return medici

# ==========================================
# ENDPOINT: Creazione Prenotazione
# ==========================================
@app.post("/api/prenotazioni", response_model=schemas.PrenotazioneResponse, status_code=201)
def crea_prenotazione(prenotazione: schemas.PrenotazioneCreate, id_paziente: int, db: Session = Depends(get_db)):
    medico = db.query(models.Medico).filter(models.Medico.id_medico == prenotazione.id_medico).first()
    if not medico:
        raise HTTPException(status_code=404, detail="Medico non trovato")

    paziente = db.query(models.Paziente).filter(models.Paziente.id_paziente == id_paziente).first()
    if not paziente:
        raise HTTPException(status_code=404, detail="Paziente non trovato")

    # 1. Salviamo la prenotazione
    nuova_prenotazione = models.Prenotazione(
        id_paziente=id_paziente,
        id_medico=prenotazione.id_medico,
        data_visita=prenotazione.data_visita,
        ora_visita=prenotazione.ora_visita,
        motivo_visita=prenotazione.motivo_visita,
        stato="Confermata"
    )
    db.add(nuova_prenotazione)
    db.commit()
    db.refresh(nuova_prenotazione)
    
    # 2. NOVITÀ: Generiamo automaticamente il referto iniziale!
    testo_referto = f"Referto Visita Preliminare\n\nData: {prenotazione.data_visita}\nOra: {prenotazione.ora_visita}\nMotivo della richiesta: {prenotazione.motivo_visita}\n\nNote Medico: [Da compilare dopo la visita]"
    
    nuovo_referto = models.Referto(
        id_paziente=id_paziente,
        id_medico=prenotazione.id_medico,
        data_referto=prenotazione.data_visita,
        contenuto=testo_referto
    )
    db.add(nuovo_referto)
    db.commit()

    # 3. NOVITÀ: Generiamo automaticamente una fattura con importo random tra 30 e 50 euro!
    # round(..., 2) serve a tenere solo due decimali (es. 45.50)
    importo_random = round(random.uniform(30.0, 50.0), 2)
    
    nuova_fattura = models.Fattura(
        id_prenotazione=nuova_prenotazione.id_prenotazione,
        importo=importo_random,
        data_emissione=prenotazione.data_visita,
        pagata="Sì"
    )
    db.add(nuova_fattura)
    db.commit()
    
    return nuova_prenotazione

# ==========================================
# ENDPOINT: Lettura Referti per Medico
# ==========================================
# Aggiungi questo endpoint sotto quelli dei referti che hai già!
@app.get("/api/referti/medico/{id_medico}", response_model=list[schemas.RefertoResponse])
def get_referti_medico(id_medico: int, db: Session = Depends(get_db)):
    return db.query(models.Referto).filter(models.Referto.id_medico == id_medico).all()

# ==========================================
# ENDPOINT: Lettura di tutte le Prenotazioni
# ==========================================
@app.get("/api/prenotazioni", response_model=list[schemas.PrenotazioneResponse])
def get_prenotazioni(db: Session = Depends(get_db)):
    # Restituisce l'elenco completo delle visite
    prenotazioni = db.query(models.Prenotazione).all()
    return prenotazioni

# ==========================================
# ENDPOINT: Login Utente
# ==========================================
from pydantic import BaseModel

# Creiamo uno schema rapido solo per ricevere email e password
class LoginSchema(BaseModel):
    email: str
    password: str

@app.post("/api/utenti/login")
def login_utente(credenziali: LoginSchema, db: Session = Depends(get_db)):
    # 1. Cerchiamo l'utente
    utente = db.query(models.Utente).filter(models.Utente.email == credenziali.email).first()
    
    if not utente or utente.password_hash != credenziali.password + "hashed":
        raise HTTPException(status_code=401, detail="Email o password errati")
    
    # 2. Prepariamo la risposta base
    risposta = {
        "messaggio": "Login effettuato con successo", 
        "id_utente": utente.id_utente,
        "ruolo": utente.ruolo,
        "id_profilo": None # Questo diventerà l'ID del Paziente o del Medico
    }
    
    # 3. Cerchiamo il profilo specifico in base al ruolo
    if utente.ruolo == "Paziente":
        paziente = db.query(models.Paziente).filter(models.Paziente.id_utente == utente.id_utente).first()
        if paziente: 
            risposta["id_profilo"] = paziente.id_paziente
            
    elif utente.ruolo == "Medico":
        medico = db.query(models.Medico).filter(models.Medico.id_utente == utente.id_utente).first()
        if medico: 
            risposta["id_profilo"] = medico.id_medico
            
    return risposta

# ==========================================
# ENDPOINT: Gestione Referti
# ==========================================
@app.post("/api/referti", response_model=schemas.RefertoResponse)
def crea_referto(referto: schemas.RefertoCreate, db: Session = Depends(get_db)):
    nuovo_referto = models.Referto(**referto.dict())
    db.add(nuovo_referto)
    db.commit()
    db.refresh(nuovo_referto)
    return nuovo_referto

@app.get("/api/referti/{id_paziente}", response_model=list[schemas.RefertoResponse])
def get_referti_paziente(id_paziente: int, db: Session = Depends(get_db)):
    return db.query(models.Referto).filter(models.Referto.id_paziente == id_paziente).all()

@app.get("/api/dashboard/medico/{id_medico}", response_model=schemas.DashboardMedico)
def get_dashboard_medico(id_medico: int, db: Session = Depends(get_db)):
    fatturato = db.query(func.sum(models.Fattura.importo))\
                  .join(models.Prenotazione)\
                  .filter(models.Prenotazione.id_medico == id_medico)\
                  .scalar() or 0.0
                  
    numero_referti = db.query(models.Referto).filter(models.Referto.id_medico == id_medico).count()
    
    numero_pazienti = db.query(func.count(func.distinct(models.Prenotazione.id_paziente)))\
                        .filter(models.Prenotazione.id_medico == id_medico)\
                        .scalar() or 0
    
    # NOVITÀ: Recuperiamo tutte le transazioni di questo medico
    transazioni = db.query(models.Fattura)\
                    .join(models.Prenotazione)\
                    .filter(models.Prenotazione.id_medico == id_medico)\
                    .order_by(models.Fattura.data_emissione.desc())\
                    .all()
    
    return {
        "fatturato": fatturato,
        "numero_referti": numero_referti,
        "numero_pazienti": numero_pazienti,
        "transazioni": transazioni
    }