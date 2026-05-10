# Reward Rover Server

## Setup

1. Copy env template and set a JWT secret:
   - `cp .env.example .env`
   - Set `JWT_SECRET` to a long random value.
   - Add `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` if you want social login.
2. Install dependencies:
   - `npm install`
3. Start the server:
   - `npm run start`

## Notes

- The SQLite database file is created under `server/data/` (see `DB_PATH` in `.env`).
- User `max` is always treated as `admin`.
