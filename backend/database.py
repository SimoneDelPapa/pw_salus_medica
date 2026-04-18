import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

# Cerca la URL del DB Cloud nel file .env. Se non c'è, usa il database locale di backup.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./salus_medica.db")

if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configurazione dinamica (Cloud vs Locale)
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
    Inizializza una sessione locale del database per ogni richiesta 
    e assicura la chiusura della connessione al termine.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()