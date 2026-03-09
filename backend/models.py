from sqlalchemy import Column, Integer, String, ForeignKey, Date, Time
from sqlalchemy.orm import relationship, declarative_base

# Creiamo la classe base da cui erediteranno tutti i nostri modelli
Base = declarative_base()

class Utente(Base):
    __tablename__ = "utenti"
    
    id_utente = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    ruolo = Column(String, nullable=False) # Valori attesi: 'Paziente', 'Medico', 'Admin'

    # Relazioni: un utente è collegato a un solo profilo (Paziente o Medico)
    paziente = relationship("Paziente", back_populates="utente", uselist=False)
    medico = relationship("Medico", back_populates="utente", uselist=False)

class Paziente(Base):
    __tablename__ = "pazienti"
    
    id_paziente = Column(Integer, primary_key=True, index=True)
    id_utente = Column(Integer, ForeignKey("utenti.id_utente"))
    nome = Column(String, nullable=False)
    cognome = Column(String, nullable=False)
    codice_fiscale = Column(String, unique=True)
    telefono = Column(String)
    data_nascita = Column(Date)

    # Relazioni
    utente = relationship("Utente", back_populates="paziente")
    prenotazioni = relationship("Prenotazione", back_populates="paziente")

class Medico(Base):
    __tablename__ = "medici"
    
    id_medico = Column(Integer, primary_key=True, index=True)
    id_utente = Column(Integer, ForeignKey("utenti.id_utente"))
    nome = Column(String, nullable=False)
    cognome = Column(String, nullable=False)
    specializzazione = Column(String, nullable=False)

    # Relazioni
    utente = relationship("Utente", back_populates="medico")
    prenotazioni = relationship("Prenotazione", back_populates="medico")

class Prenotazione(Base):
    __tablename__ = "prenotazioni"
    
    id_prenotazione = Column(Integer, primary_key=True, index=True)
    id_paziente = Column(Integer, ForeignKey("pazienti.id_paziente"))
    id_medico = Column(Integer, ForeignKey("medici.id_medico"))
    data_visita = Column(Date, nullable=False)
    ora_visita = Column(Time, nullable=False)
    motivo_visita = Column(String)
    stato = Column(String, default="In attesa") # In attesa, Confermata, Cancellata, Completata
    note_medico = Column(String)

    # Relazioni
    paziente = relationship("Paziente", back_populates="prenotazioni")
    medico = relationship("Medico", back_populates="prenotazioni")

from sqlalchemy import Float # Aggiungi Float in cima agli import!

# ... (Lascia intatte le classi Utente, Paziente, Medico, Prenotazione) ...

class Referto(Base):
    __tablename__ = "referti"
    
    id_referto = Column(Integer, primary_key=True, index=True)
    id_paziente = Column(Integer, ForeignKey("pazienti.id_paziente"))
    id_medico = Column(Integer, ForeignKey("medici.id_medico"))
    data_referto = Column(Date, nullable=False)
    contenuto = Column(String, nullable=False) # Il testo della diagnosi
    
    # Relazioni
    paziente = relationship("Paziente")
    medico = relationship("Medico")

class Fattura(Base):
    __tablename__ = "fatture"
    
    id_fattura = Column(Integer, primary_key=True, index=True)
    id_prenotazione = Column(Integer, ForeignKey("prenotazioni.id_prenotazione"))
    importo = Column(Float, nullable=False) # Es. 150.50 euro
    data_emissione = Column(Date, nullable=False)
    pagata = Column(String, default="Sì")