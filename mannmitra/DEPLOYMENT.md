# Mannmitra Deployment Guide

## 1) Architecture

- Frontend: `mannmitra/client` (Vite + React)
- Main backend: `mannmitra/server` (Node.js + Express + Socket.IO)
- Optional Python chatbot service: `mannmitra/Chatbot_` (FastAPI)
- Optional Python risk API: `mental_health_risk_api` (FastAPI)

## 2) Recommended Production Setup

- Frontend on Vercel or Netlify
- Node backend on Render/Railway/EC2
- MongoDB on MongoDB Atlas
- Optional Python services on Render/Railway

## 3) Environment Variables

### `mannmitra/server`

Use `server/.env.example` and set at least:

- `PORT` (example: `5000`)
- `MONGO_URI` (Atlas connection string)
- `CLIENT_URL` (your deployed frontend URL)
- `JWT_SECRET` (strong random secret)
- `ENCRYPTION_KEY` (strong 32-byte key)
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `MAIN_ADMIN_EMAIL`
- `MAIN_ADMIN_PASSWORD`

Optional AI variables:

- `GROQ_API_KEY`
- `GROQ_MODEL`
- `MHH_CHATBOT_URL` (if using `Chatbot_`)
- `HF_TOKEN`

### `mannmitra/client`

- `VITE_API_BASE_URL` = deployed backend URL + `/api`
- Example: `https://your-backend-domain.com/api`

### Optional Python services

- `HF_TOKEN` for `mental_health_risk_api`

## 4) Deploy Backend (Render example)

1. Create a new Web Service from `mannmitra/server`.
2. Build command: `npm install`
3. Start command: `npm start`
4. Add all required environment variables.
5. After deploy, verify:
   - `GET https://<backend>/health`

## 5) Deploy Frontend (Vercel example)

1. Import project rooted at `mannmitra/client`.
2. Framework preset: `Vite`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add env:
   - `VITE_API_BASE_URL=https://<backend>/api`
6. Deploy and test login/chat flows from the live URL.

## 6) Deploy Optional Python Services

### `mental_health_risk_api`

1. Create a service from `mental_health_risk_api`.
2. Build command: `pip install -r requirements.txt`
3. Start command:
   - `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add env:
   - `HF_TOKEN=<your_hf_token>`
5. Health check:
   - `GET https://<risk-api>/health`

### `Chatbot_`

Deploy similarly and set `MHH_CHATBOT_URL` in Node backend to that URL.

## 7) Final Production Checklist

- Set strong secrets (no defaults)
- Enable CORS with exact frontend URL in `CLIENT_URL`
- Set database IP/network access securely
- Rotate API keys and never commit `.env` files
- Test `/health`, auth, chat, screening, booking, and forum routes
