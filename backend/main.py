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

app = FastAPI(title="Salus Medica API", version="1.3.6")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# ENDPOINT DI RISVEGLIO (PING) PER RENDER / UPTIMEROBOT
# =============================================================================
@app.get("/api/ping")
@app.head("/api/ping")
def mantieni_sveglio():
    """
    Endpoint leggerissimo usato da UptimeRobot per mantenere 
    il server Render sempre attivo senza pesare sul database.
    """
    return {"status": "ok", "messaggio": "Il server è sveglio e operativo!"}

class LoginSchema(BaseModel):
    email: str
    password: str

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================
def is_visita_passata(data_visita, ora_visita) -> bool:
    try:
        d_str = str(data_visita).split(" ")[0]  
        o_str = str(ora_visita) if ora_visita else "00:00:00"
        o_str = o_str[:5]  
        visit_dt = datetime.strptime(f"{d_str} {o_str}", "%Y-%m-%d %H:%M")
        return datetime.now() >= visit_dt
    except Exception:
        return False

def sincronizza_stato_visita(db: Session, p: models.Prenotazione) -> bool:
    if p.stato == "In attesa" and is_visita_passata(p.data_visita, p.ora_visita):
        p.stato = "Confermata"
        return True
    return False

# =============================================================================
# ENDPOINT UTENTI
# =============================================================================
@app.post("/api/utenti/registrazione", status_code=201)
def registra_utente(dati: schemas.UtenteRegistrazione, db: Session = Depends(database.get_db)):
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
            id_utente=nuovo_utente.id_utente, 
            nome=dati.nome, 
            cognome=dati.cognome, 
            codice_fiscale=dati.codice_fiscale, 
            telefono=dati.telefono, 
            data_nascita=dati.data_nascita,
            sesso=dati.sesso,
            luogo_nascita=dati.luogo_nascita
        )
        db.add(nuovo_profilo)
    else:
        nuovo_profilo = models.Medico(
            id_utente=nuovo_utente.id_utente, 
            nome=dati.nome, 
            cognome=dati.cognome, 
            specializzazione=dati.specializzazione,
            codice_fiscale=dati.codice_fiscale, 
            telefono=dati.telefono, 
            data_nascita=dati.data_nascita,
            sesso=dati.sesso,
            luogo_nascita=dati.luogo_nascita
        )
        db.add(nuovo_profilo)
    db.commit()
    return nuovo_utente

@app.post("/api/utenti/login")
def login_utente(credenziali: LoginSchema, db: Session = Depends(database.get_db)):
    utente = db.query(models.Utente).filter(models.Utente.email == credenziali.email).first()
    if not utente or utente.password_hash != f"{credenziali.password}hashed":
        raise HTTPException(status_code=401, detail="Email o password errati")
    
    res = {"id_utente": utente.id_utente, "ruolo": utente.ruolo, "id_profilo": None, "nome": "", "cognome": ""}
    
    if utente.ruolo == "Paziente":
        p = db.query(models.Paziente).filter(models.Paziente.id_utente == utente.id_utente).first()
        if p: 
            res.update({
                "id_profilo": p.id_paziente, 
                "nome": p.nome, 
                "cognome": p.cognome, 
                "telefono": getattr(p, "telefono", ""), 
                "codice_fiscale": getattr(p, "codice_fiscale", ""),
                "sesso": getattr(p, "sesso", ""),
                "data_nascita": getattr(p, "data_nascita", ""),
                "luogo_nascita": getattr(p, "luogo_nascita", "")
            })
    else:
        m = db.query(models.Medico).filter(models.Medico.id_utente == utente.id_utente).first()
        if m: 
            res.update({
                "id_profilo": m.id_medico, 
                "nome": m.nome, 
                "cognome": m.cognome, 
                "specializzazione": m.specializzazione,
                "telefono": getattr(m, "telefono", ""),
                "codice_fiscale": getattr(m, "codice_fiscale", ""),
                "sesso": getattr(m, "sesso", ""),
                "data_nascita": getattr(m, "data_nascita", ""),
                "luogo_nascita": getattr(m, "luogo_nascita", "")
            })
    return res

@app.put("/api/utenti/profilo/{ruolo}/{id_profilo}")
def aggiorna_profilo(ruolo: str, id_profilo: int, dati: dict, db: Session = Depends(database.get_db)):
    if ruolo == "Paziente":
        profilo = db.query(models.Paziente).filter(models.Paziente.id_paziente == id_profilo).first()
    else:
        profilo = db.query(models.Medico).filter(models.Medico.id_medico == id_profilo).first()

    if not profilo: 
        raise HTTPException(status_code=404, detail="Profilo non trovato")
    
    # --- NUOVO CONTROLLO: ETÀ MEDICO (18+) LATO SERVER ---
    if ruolo == "Medico" and dati.get("data_nascita"):
        try:
            data_nascita_dt = datetime.strptime(dati["data_nascita"], "%Y-%m-%d").date()
            oggi = datetime.today().date()
            eta = oggi.year - data_nascita_dt.year - ((oggi.month, oggi.day) < (data_nascita_dt.month, data_nascita_dt.day))
            if eta < 18:
                raise HTTPException(status_code=400, detail="Il medico deve essere maggiorenne.")
        except ValueError:
            pass # Se la data è malformata, la ignoriamo qui (ci penseranno altri controlli)

    # SCUDO PROTETTIVO: Definiamo i campi da NON toccare o salvare mai
    campi_da_ignorare = ["id", "id_paziente", "id_medico", "id_utente", "ruolo"]
    if ruolo == "Paziente":
        campi_da_ignorare.append("specializzazione")

    # Aggiornamento selettivo
    for key, value in dati.items():
        if key in campi_da_ignorare or value is None:
            continue
        if hasattr(profilo, key): 
            setattr(profilo, key, value)
    
    # Aggiornamento Email automatica
    utente = db.query(models.Utente).filter(models.Utente.id_utente == profilo.id_utente).first()
    nuova_email = utente.email if utente else ""
    
    if utente:
        dominio = utente.email.split("@")[1] if "@" in utente.email else "salus.it"
        nome_pulito = profilo.nome.strip().lower().replace(" ", "")
        cognome_pulito = profilo.cognome.strip().lower().replace(" ", "")
        email_calcolata = f"{nome_pulito}.{cognome_pulito}@{dominio}"
        
        email_esistente = db.query(models.Utente).filter(models.Utente.email == email_calcolata, models.Utente.id_utente != utente.id_utente).first()
        if not email_esistente:
            utente.email = email_calcolata
            nuova_email = email_calcolata

    # SALVATAGGIO CON CATTURA ERRORI
    try:
        db.commit()
        db.refresh(profilo)
    except Exception as e:
        db.rollback()
        print(f"\n[ERRORE CRITICO SUPABASE] Fallimento durante l'update: {e}\n")
        raise HTTPException(status_code=500, detail="Errore durante il salvataggio su database.")

    return {"message": "Profilo aggiornato con successo", "nuova_email": nuova_email, "nuovo_cf": getattr(profilo, "codice_fiscale", "")}

# =============================================================================
# ENDPOINT CLINICI E DASHBOARD
# =============================================================================
@app.get("/api/medici")
def get_medici(db: Session = Depends(database.get_db)):
    return db.query(models.Medico).all()

@app.get("/api/medico/{id_medico}/pazienti")
def get_pazienti_medico(id_medico: int, db: Session = Depends(database.get_db)):
    # Aggiungiamo il filtro per ignorare le prenotazioni con stato "Annullata"
    return db.query(models.Paziente).join(models.Prenotazione).filter(
        models.Prenotazione.id_medico == id_medico,
        models.Prenotazione.stato != "Annullata"
    ).distinct().all()

@app.get("/api/medico/paziente/{id_paziente}/dettagli")
def get_dettagli_paziente(id_paziente: int, id_medico: Optional[int] = None, db: Session = Depends(database.get_db)):
    query = db.query(models.Prenotazione, models.Fattura.importo).outerjoin(
        models.Fattura, models.Fattura.id_prenotazione == models.Prenotazione.id_prenotazione
    ).filter(
        models.Prenotazione.id_paziente == id_paziente, 
        models.Prenotazione.stato != "Annullata"
    )
    if id_medico: query = query.filter(models.Prenotazione.id_medico == id_medico)
        
    registri = query.order_by(models.Prenotazione.data_visita.desc()).all()
    risultato, salv_nec = [], False
    
    for p, imp in registri:
        if sincronizza_stato_visita(db, p): salv_nec = True
        risultato.append({
            "id_prenotazione": p.id_prenotazione,
            "data_visita": str(p.data_visita)[:10],
            "ora_visita": str(p.ora_visita)[:5] if p.ora_visita else "00:00",
            "motivo": p.motivo_visita,
            "stato": p.stato,
            "importo": float(imp) if imp else 0.0,
            "nome_medico": p.medico.nome if p.medico else "",
            "cognome_medico": p.medico.cognome if p.medico else "",
            "codice_fiscale": getattr(p.paziente, "codice_fiscale", "") if p.paziente else "" 
        })
        
    if salv_nec: db.commit()
    return risultato

@app.get("/api/dashboard/medico/{id_medico}")
def get_dashboard_medico(id_medico: int, db: Session = Depends(database.get_db)):
    prenotazioni = db.query(models.Prenotazione).filter(models.Prenotazione.id_medico == id_medico, models.Prenotazione.stato != "Annullata").all()
    fatturato, pazienti, referti, salv_nec = 0.0, set(), 0, False
    for p in prenotazioni:
        if sincronizza_stato_visita(db, p): salv_nec = True
        if p.stato == "Confermata":
            pazienti.add(p.id_paziente)
            referti += 1
            f = db.query(models.Fattura).filter(models.Fattura.id_prenotazione == p.id_prenotazione).first()
            if f: fatturato += f.importo
    if salv_nec: db.commit()
    return {"fatturato": float(fatturato), "numero_pazienti": len(pazienti), "numero_referti": referti}

@app.get("/api/dashboard/paziente/{id_paziente}")
def get_paziente_dashboard(id_paziente: int, db: Session = Depends(database.get_db)):
    prenotazioni = db.query(models.Prenotazione).filter(models.Prenotazione.id_paziente == id_paziente, models.Prenotazione.stato != "Annullata").all()
    stats = {"fatture_pagate": 0.0, "fatture_da_pagare": 0.0, "referti_emessi": 0, "referti_da_emettere": 0}
    salv_nec = False
    for p in prenotazioni:
        if sincronizza_stato_visita(db, p): salv_nec = True
        if p.stato == "Confermata": stats["referti_emessi"] += 1
        else: stats["referti_da_emettere"] += 1
        
        f = db.query(models.Fattura).filter(models.Fattura.id_prenotazione == p.id_prenotazione).first()
        if f:
            if p.stato == "Confermata": stats["fatture_pagate"] += float(f.importo)
            else: stats["fatture_da_pagare"] += float(f.importo)
            
    if salv_nec: db.commit()
    return stats

@app.post("/api/prenotazioni", status_code=201)
def crea_prenotazione(prenotazione: schemas.PrenotazioneCreate, id_paziente: int, db: Session = Depends(database.get_db)):
    try:
        d_str = str(prenotazione.data_visita).split(" ")[0]
        o_str = str(prenotazione.ora_visita)[:5]
        visita_dt = datetime.strptime(f"{d_str} {o_str}", "%Y-%m-%d %H:%M")
        
        if visita_dt < datetime.now():
            raise HTTPException(status_code=400, detail="Impossibile prenotare nel passato.")
        
        if visita_dt.weekday() == 6:
            raise HTTPException(status_code=400, detail="La clinica è chiusa di domenica.")

        orario_visita = visita_dt.time()
        orario_apertura = datetime.strptime("07:00", "%H:%M").time()
        orario_chiusura = datetime.strptime("19:00", "%H:%M").time()
        if orario_visita < orario_apertura or orario_visita >= orario_chiusura:
            raise HTTPException(status_code=400, detail="Orario non consentito. Le visite si effettuano dalle 07:00 alle 19:00.")
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Formato data/ora non valido.")

    nuova_p = models.Prenotazione(id_paziente=id_paziente, id_medico=prenotazione.id_medico, data_visita=prenotazione.data_visita, ora_visita=prenotazione.ora_visita, motivo_visita=prenotazione.motivo_visita, stato="In attesa")
    db.add(nuova_p)
    db.commit()
    db.refresh(nuova_p)
    db.add(models.Referto(id_paziente=id_paziente, id_medico=prenotazione.id_medico, data_referto=prenotazione.data_visita, contenuto="..."))
    db.add(models.Fattura(id_prenotazione=nuova_p.id_prenotazione, importo=round(random.uniform(50.0, 100.0), 2), data_emissione=prenotazione.data_visita, pagata="No"))
    db.commit()
    return nuova_p

@app.put("/api/prenotazioni/{id_prenotazione}/annulla")
def annulla_prenotazione(id_prenotazione: int, db: Session = Depends(database.get_db)):
    p = db.query(models.Prenotazione).filter(models.Prenotazione.id_prenotazione == id_prenotazione).first()
    if not p: raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    if p.stato == "Confermata":
        raise HTTPException(status_code=400, detail="Impossibile annullare una visita confermata.")
    p.stato = "Annullata"
    db.commit()
    return {"message": "Visita annullata"}