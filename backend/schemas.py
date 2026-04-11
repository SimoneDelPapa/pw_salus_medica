from pydantic import BaseModel
from datetime import date, time
from typing import Optional

# ==========================================
# SCHEMI PER L'UTENTE (Login/Registrazione)
# ==========================================
class UtenteBase(BaseModel):
    email: str
    ruolo: str

# Schema completo per la registrazione dal front-end
class UtenteRegistrazione(UtenteBase):
    password: str
    nome: str
    cognome: str
    # Campi specifici per Paziente (opzionali per il Medico)
    codice_fiscale: Optional[str] = None
    telefono: Optional[str] = None
    data_nascita: Optional[date] = None
    # Campi specifici per Medico (opzionali per il Paziente)
    specializzazione: Optional[str] = None

# Schema usato quando il front-end invia i dati per registrare un utente (include la password)
class UtenteCreate(UtenteBase):
    password: str

# Schema usato quando il back-end risponde (NASCONDE la password per sicurezza)
class UtenteResponse(UtenteBase):
    id_utente: int

    class Config:
        from_attributes = True  # Permette a Pydantic di leggere direttamente dai modelli del Database

# ==========================================
# SCHEMI PER IL PAZIENTE E IL MEDICO
# ==========================================
class PazienteBase(BaseModel):
    nome: str
    cognome: str
    codice_fiscale: str
    telefono: Optional[str] = None
    data_nascita: Optional[date] = None

class PazienteResponse(PazienteBase):
    id_paziente: int
    id_utente: int

    class Config:
        from_attributes = True

class MedicoBase(BaseModel):
    nome: str
    cognome: str
    specializzazione: str

class MedicoResponse(MedicoBase):
    id_medico: int
    id_utente: int

    class Config:
        from_attributes = True

# ==========================================
# SCHEMI PER LE PRENOTAZIONI
# ==========================================
class PrenotazioneBase(BaseModel):
    data_visita: date
    ora_visita: time
    motivo_visita: Optional[str] = None
    stato: Optional[str] = "In attesa"
    note_medico: Optional[str] = None

# Quando un paziente crea una prenotazione, deve solo dire con QUALE medico
class PrenotazioneCreate(PrenotazioneBase):
    id_medico: int

class PrenotazioneResponse(PrenotazioneBase):
    id_prenotazione: int
    id_paziente: int
    id_medico: int

    class Config:
        from_attributes = True

# ==========================================
# SCHEMI PER REFERTI E DASHBOARD
# ==========================================
class RefertoCreate(BaseModel):
    id_paziente: int
    id_medico: int
    data_referto: date
    contenuto: str

class RefertoResponse(RefertoCreate):
    id_referto: int
    class Config:
        from_attributes = True

# La singola transazione (Fattura)
class FatturaResponse(BaseModel):
    id_fattura: int
    id_prenotazione: int
    importo: float
    data_emissione: date
    pagata: str
    class Config:
        from_attributes = True

# Aggiungiamo la lista delle transazioni alla dashboard del medico
class DashboardMedico(BaseModel):
    fatturato: float
    numero_referti: int
    numero_pazienti: int
    transazioni: list[FatturaResponse] = []

class PazienteStats(BaseModel):
    fatture_pagate: float
    fatture_da_pagare: float
    referti_emessi: int
    referti_da_emettere: int

    class Config:
        from_attributes = True