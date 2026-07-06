"""
API Gateway per Salus Medica.
Gestisce l'autenticazione, la pianificazione delle visite e il ciclo di vita dei pagamenti.
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

# =============================================================================
# ENDPOINT DI RISVEGLIO (PING) E ROOT
# =============================================================================
@app.get("/")
def home():
    return {"status": "online", "message": "API Salus Medica operative."}

@app.get("/api/ping")
@app.head("/api/ping")
def mantieni_sveglio():
    return {"status": "ok", "messaggio": "Il server è sveglio e operativo!"}

# =============================================================================
# LOGICA DI BUSINESS E HELPER
# =============================================================================
def genera_fattura(db: Session, p: models.Prenotazione):
    """Crea la fattura copiando l'importo esatto pattuito durante la prenotazione."""
    nuova_fattura = models.Fattura(
        id_prenotazione=p.id_prenotazione,
        importo=float(p.importo) if p.importo else 0.0,
        data_emissione=p.data_visita,
        pagata="No"
    )
    db.add(nuova_fattura)

def is_visita_passata(data_visita, ora_visita) -> bool:
    """Verifica se una data visita è nel passato rispetto all'orario di sistema attuale."""
    try:
        d_str = str(data_visita).split(" ")[0]
        o_str = str(ora_visita)[:5] if ora_visita else "00:00"
        visit_dt = datetime.strptime(f"{d_str} {o_str}", "%Y-%m-%d %H:%M")
        return datetime.now() >= visit_dt
    except Exception:
        return False

def sincronizza_stato_visita(db: Session, p: models.Prenotazione) -> bool:
    """
    Controlla lo stato di una prenotazione e, se scaduta, la porta a 'Confermata'.
    Contestualmente genera la fattura se non ancora presente nel sistema.
    """
    if p.stato == "In attesa" and is_visita_passata(p.data_visita, p.ora_visita):
        p.stato = "Confermata"
        if not db.query(models.Fattura).filter(models.Fattura.id_prenotazione == p.id_prenotazione).first():
            genera_fattura(db, p)
        return True
    return False

def check_is_pagata(valore_campo) -> bool:
    """Normalizza il valore del campo di pagamento booleano."""
    return str(valore_campo).strip().lower() in ["si", "true", "1", "yes"]

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

# =============================================================================
# ENDPOINT CLINICI E DASHBOARD
# =============================================================================
@app.get("/api/medici")
def get_medici(db: Session = Depends(database.get_db)):
    return db.query(models.Medico).all()

@app.get("/api/medico/{id_medico}/pazienti")
def get_pazienti_medico(id_medico: int, db: Session = Depends(database.get_db)):
    return db.query(models.Paziente).join(models.Prenotazione).filter(models.Prenotazione.id_medico == id_medico, models.Prenotazione.stato != "Annullata").distinct().all()

@app.get("/api/medico/paziente/{id_paziente}/dettagli")
def get_dettagli_paziente(id_paziente: int, id_medico: Optional[int] = None, db: Session = Depends(database.get_db)):
    query = db.query(models.Prenotazione).filter(models.Prenotazione.id_paziente == id_paziente, models.Prenotazione.stato != "Annullata")
    if id_medico: query = query.filter(models.Prenotazione.id_medico == id_medico)
        
    prenotazioni = query.order_by(models.Prenotazione.data_visita.desc()).all()
    risultato, salv_nec = [], False
    
    for p in prenotazioni:
        if sincronizza_stato_visita(db, p): salv_nec = True
        
        fattura = db.query(models.Fattura).filter(models.Fattura.id_prenotazione == p.id_prenotazione).first()
        medico = db.query(models.Medico).filter(models.Medico.id_medico == p.id_medico).first()
        
        # Gestiamo il fallback per vecchie prenotazioni senza campo importo
        importo_mostrato = float(getattr(p, "importo", 0)) if getattr(p, "importo", 0) else (float(fattura.importo) if fattura else 0.0)
            
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
            
    if salv_nec: db.commit()
    return stats

@app.get("/api/medico/{id_medico}/orari-occupati")
def get_orari_occupati(id_medico: int, data: str, db: Session = Depends(database.get_db)):
    prenotazioni = db.query(models.Prenotazione).filter(models.Prenotazione.id_medico == id_medico, models.Prenotazione.stato != "Annullata").all()
    occupati = [str(p.ora_visita)[:5] for p in prenotazioni if str(p.data_visita)[:10] == data and p.ora_visita]
    return {"occupati": occupati}

@app.post("/api/prenotazioni", status_code=201)
def crea_prenotazione(prenotazione: schemas.PrenotazioneCreate, id_paziente: int, db: Session = Depends(database.get_db)):
    d_clean = str(prenotazione.data_visita).strip()[:10]
    o_clean = str(prenotazione.ora_visita).strip()[:5]
    
    # Pulizia orario per controllo SQL
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

        # Generiamo il prezzo della visita (intero senza decimali)
        prezzo_fissato = random.randint(50, 150)

        # Creazione Prenotazione (comprensiva del prezzo fisso)
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
        db.flush() # Otteniamo l'ID temporaneo per creare il referto
        
        # Creazione del Referto contestualmente
        nuovo_referto = models.Referto(
            id_paziente=id_paziente,
            id_medico=prenotazione.id_medico,
            data_referto=d_clean,
            contenuto="..."
        )
        db.add(nuovo_referto)
        
        db.commit()
        db.refresh(nuova_p)
        
        return nuova_p

    except Exception as e:
        db.rollback()
        print(f"ERRORE CRITICO: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/prenotazioni/{id_prenotazione}/paga")
def paga_prenotazione(id_prenotazione: int, db: Session = Depends(database.get_db)):
    fattura = db.query(models.Fattura).filter(models.Fattura.id_prenotazione == id_prenotazione).first()
    if not fattura: raise HTTPException(status_code=404, detail="Fattura non trovata")
    fattura.pagata = "Si"
    db.commit()
    return {"message": "Pagamento confermato"}

@app.put("/api/prenotazioni/{id_prenotazione}/annulla")
def annulla_prenotazione(id_prenotazione: int, db: Session = Depends(database.get_db)):
    p = db.query(models.Prenotazione).filter(models.Prenotazione.id_prenotazione == id_prenotazione).first()
    if not p: raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    if p.stato == "Confermata": raise HTTPException(status_code=400, detail="Impossibile annullare una visita confermata.")
    p.stato = "Annullata"
    db.commit()
    return {"message": "Visita annullata"}