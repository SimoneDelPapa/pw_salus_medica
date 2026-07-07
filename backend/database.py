"""
Modulo di configurazione del Database.
Gestisce l'inizializzazione del motore SQLAlchemy, il pooling delle connessioni
e l'instradamento dinamico basato sull'ambiente (PostgreSQL in Cloud vs SQLite Locale).
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./salus_medica.db")

if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """
    Provider di dependency injection per la gestione delle sessioni del database.
    Inizializza una nuova sessione per la richiesta corrente e garantisce 
    il rilascio sicuro delle risorse al termine del ciclo di vita della chiamata HTTP.
    
    Yields:
        Session: Un'istanza attiva della sessione SQLAlchemy.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()