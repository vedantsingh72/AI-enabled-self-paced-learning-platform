# Mannmitra

Student wellness + adaptive learning platform (React + Node + MongoDB). Optional Python services: MHH chatbot (`Chatbot_/`) and standalone risk API (`../mental_health_risk_api/`).

## Full project & judge guide

See **[../README.md](../README.md)** in the repo root for architecture, features, privacy talking points, env vars, demo script, and **judge Q&A**.

## Quick setup

1. Copy `server/.env.example` → `server/.env` and set `MONGO_URI`, secrets, and optional `GROQ_API_KEY`, `MHH_CHATBOT_URL`, `HF_TOKEN`.
2. Copy `client/.env.example` → `client/.env` and set `VITE_API_URL` (e.g. `http://localhost:5000/api`).
3. `cd server && npm install && npm run dev`
4. `cd client && npm install && npm run dev`

## API prefix

All backend routes are under `/api` (e.g. `http://localhost:5000/api/...`). Health: `GET http://localhost:5000/health`.
