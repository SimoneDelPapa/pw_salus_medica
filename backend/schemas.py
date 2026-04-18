from pydantic import BaseModel
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
    sesso: str
    data_nascita: str
    luogo_nascita: str
    codice_fiscale: str
    telefono: Optional[str] = None
    specializzazione: Optional[str] = None

class UtenteCreate(UtenteBase):
    password: str

class UtenteResponse(UtenteBase):
    id_utente: int
    class Config:
        from_attributes = True

# ==========================================
# SCHEMI PER IL PAZIENTE E IL MEDICO
# ==========================================
class PazienteBase(BaseModel):
    nome: str
    cognome: str
    codice_fiscale: str
    telefono: Optional[str] = None
    sesso: Optional[str] = None
    data_nascita: Optional[str] = None
    luogo_nascita: Optional[str] = None

class PazienteResponse(PazienteBase):
    id_paziente: int
    id_utente: int
    class Config:
        from_attributes = True

class MedicoBase(BaseModel):
    nome: str
    cognome: str
    specializzazione: str
    codice_fiscale: Optional[str] = None
    telefono: Optional[str] = None
    sesso: Optional[str] = None
    data_nascita: Optional[str] = None
    luogo_nascita: Optional[str] = None

class MedicoResponse(MedicoBase):
    id_medico: int
    id_utente: int
    class Config:
        from_attributes = True

# ==========================================
# SCHEMI PER PRENOTAZIONI, REFERTI, FATTURE
# ==========================================
class PrenotazioneBase(BaseModel):
    data_visita: str
    ora_visita: str
    motivo_visita: Optional[str] = None
    stato: Optional[str] = "In attesa"

class PrenotazioneCreate(PrenotazioneBase):
    id_medico: int

class PrenotazioneResponse(PrenotazioneBase):
    id_prenotazione: int
    id_paziente: int
    id_medico: int
    class Config:
        from_attributes = True

class RefertoCreate(BaseModel):
    id_paziente: int
    id_medico: int
    data_referto: str
    contenuto: str

class RefertoResponse(RefertoCreate):
    id_referto: int
    class Config:
        from_attributes = True

class FatturaResponse(BaseModel):
    id_fattura: int
    id_prenotazione: int
    importo: float
    data_emissione: str
    pagata: str
    class Config:
        from_attributes = True

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