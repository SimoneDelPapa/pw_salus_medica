from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 1. Definiamo l'URL del database. 
# Creerà un file chiamato "salus_medica.db" nella cartella corrente.
SQLALCHEMY_DATABASE_URL = "sqlite:///./salus_medica.db"

# 2. Creiamo il "motore" (engine) che gestisce la connessione a SQLite.
# check_same_thread=False è necessario solo per SQLite con FastAPI.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 3. Creiamo una "fabbrica" di sessioni. 
# Ogni volta che faremo una richiesta alle API, apriremo una sessione temporanea.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)