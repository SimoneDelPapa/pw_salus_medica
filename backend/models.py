"""
Modulo dei modelli ORM (Object-Relational Mapping).
Definisce lo schema del database e le relazioni tra le entità principali del sistema.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, Float, Date, Time
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

class Utente(Base):
    """
    Rappresenta l'entità radice per l'autenticazione e l'autorizzazione.
    Mantiene le credenziali di accesso e definisce il ruolo dell'utente all'interno del sistema.
    """
    __tablename__ = "utenti"
    
    id_utente = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    ruolo = Column(String, nullable=False)

    paziente = relationship("Paziente", back_populates="utente", uselist=False)
    medico = relationship("Medico", back_populates="utente", uselist=False)


class Paziente(Base):
    """
    Rappresenta il profilo anagrafico e di contatto di un paziente.
    Possiede una relazione 1:1 con l'entità Utente e una relazione 1:N con le Prenotazioni.
    """
    __tablename__ = "pazienti"
    
    id_paziente = Column(Integer, primary_key=True, index=True)
    id_utente = Column(Integer, ForeignKey("utenti.id_utente"))
    nome = Column(String, nullable=False)
    cognome = Column(String, nullable=False)
    codice_fiscale = Column(String, unique=True)
    telefono = Column(String)
    sesso = Column(String)
    data_nascita = Column(String)
    luogo_nascita = Column(String)

    utente = relationship("Utente", back_populates="paziente")
    prenotazioni = relationship("Prenotazione", back_populates="paziente")


class Medico(Base):
    """
    Rappresenta il profilo professionale e anagrafico di un medico.
    Definisce la specializzazione per l'assegnazione delle visite.
    Possiede una relazione 1:1 con l'entità Utente e una relazione 1:N con le Prenotazioni.
    """
    __tablename__ = "medici"
    
    id_medico = Column(Integer, primary_key=True, index=True)
    id_utente = Column(Integer, ForeignKey("utenti.id_utente"))
    nome = Column(String, nullable=False)
    cognome = Column(String, nullable=False)
    specializzazione = Column(String, nullable=False)
    codice_fiscale = Column(String)
    telefono = Column(String)
    sesso = Column(String)
    data_nascita = Column(String)
    luogo_nascita = Column(String)

    utente = relationship("Utente", back_populates="medico")
    prenotazioni = relationship("Prenotazione", back_populates="medico")


class Prenotazione(Base):
    """
    Gestisce il ciclo di vita di una singola visita medica.
    Collega un Paziente a un Medico per una specifica data e ora, monitorandone lo stato.
    """
    __tablename__ = "prenotazioni"
    
    id_prenotazione = Column(Integer, primary_key=True, index=True)
    id_paziente = Column(Integer, ForeignKey("pazienti.id_paziente"))
    id_medico = Column(Integer, ForeignKey("medici.id_medico"))
    data_visita = Column(Date, nullable=False)
    ora_visita = Column(Time, nullable=False)
    motivo_visita = Column(String)
    stato = Column(String, default="In attesa")
    importo = Column(Integer, default=0)

    paziente = relationship("Paziente", back_populates="prenotazioni")
    medico = relationship("Medico", back_populates="prenotazioni")


class Referto(Base):
    """
    Archivia l'esito clinico redatto dal medico al termine di una visita.
    Mantiene lo storico diagnostico associato al paziente.
    """
    __tablename__ = "referti"
    
    id_referto = Column(Integer, primary_key=True, index=True)
    id_paziente = Column(Integer, ForeignKey("pazienti.id_paziente"))
    id_medico = Column(Integer, ForeignKey("medici.id_medico"))
    data_referto = Column(Date, nullable=False)
    contenuto = Column(String, nullable=False)
    
    paziente = relationship("Paziente")
    medico = relationship("Medico")


class Fattura(Base):
    """
    Gestisce gli aspetti contabili legati a una prenotazione.
    Traccia l'importo dovuto e lo stato dei pagamenti.
    """
    __tablename__ = "fatture"
    
    id_fattura = Column(Integer, primary_key=True, index=True)
    id_prenotazione = Column(Integer, ForeignKey("prenotazioni.id_prenotazione"))
    importo = Column(Float, nullable=False)
    data_emissione = Column(Date, nullable=False)
    pagata = Column(String, default="No")