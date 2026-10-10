# Deploying NYU LIMS on Render

This repo includes a Render Blueprint (`render.yaml`) that creates two services:

| Service | Type | What it runs |
|---|---|---|
| `nyulims-api` | Web service (Starter) | FastAPI backend (`backend/`) |
| `nyulims-web` | Static site | React + Vite frontend (`frontend/`) |

The deployed copy is a **portfolio demo**: on every deploy it starts with a fresh
SQLite database filled with sample lab orders and blockers (`DEMO_SEED=true`).

## Environment variables to set in Render

`nyulims-api`
- `ADMIN_PASSWORD`: password for the `admin` user account
- `SYSTEM_PASSWORD`: the password typed on the login page
- `CORS_ORIGINS`: the frontend URL, e.g. `https://nyulims-web.onrender.com`

`nyulims-web`
- `VITE_API_URL`: backend URL + `/api/v1`, e.g. `https://nyulims-api.onrender.com/api/v1`
- `VITE_DEMO_PASSWORD`: same as `SYSTEM_PASSWORD`; shown on the login page for reviewers

## Production use

For a real lab deployment, set `DEMO_SEED=false` and point `DATABASE_URL`
at a managed PostgreSQL database instead of SQLite.
