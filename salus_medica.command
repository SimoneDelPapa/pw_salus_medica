#!/bin/bash

echo "====================================="
echo "   Avvio Clinica Salus Medica...     "
echo "   Premi Ctrl+C per spegnere tutto   "
echo "====================================="

# 1. FUNZIONE DI SPEGNIMENTO (La Magia)
# Questa funzione scatta automaticamente quando premi Ctrl+C
spegni_tutto() {
    echo ""
    echo "🛑 Ricevuto segnale di chiusura (Ctrl+C)."
    echo "Spegnimento dei server in corso..."
    
    # Uccide i processi usando i loro ID
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    
    # Doppio controllo per sicurezza
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    
    echo "✅ Tutto spento in modo pulito. Arrivederci!"
    sleep 3
    exit 0
}

# 2. TRAPPOLA PER CTRL+C (SIGINT)
trap spegni_tutto SIGINT SIGTERM

# 3. PULIZIA INIZIALE
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# 4. AVVIO BACKEND
cd "/Users/simonedelpapa/Desktop/pw_salus_medica/backend"
source venv/bin/activate
uvicorn main:app --port 8000 &
BACKEND_PID=$!  # Salva l'ID del backend

# 5. AVVIO FRONTEND
cd "/Users/simonedelpapa/Desktop/pw_salus_medica/frontend"
npm run dev &
FRONTEND_PID=$! # Salva l'ID del frontend

# 6. APRI BROWSER
sleep 3
open "http://localhost:5173"

# 7. METTI IN ATTESA LO SCRIPT
# Continuerai a vedere i log di entrambi i server, 
# ma lo script aspetterà qui finché non premi Ctrl+C
wait