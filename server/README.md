# Reward Rover Server

## Setup

1. Copy env template and set a JWT secret:
   - `cp .env.example .env`
   - Set `JWT_SECRET` to a long random value.
2. Install dependencies:
   - `npm install`
3. Start the server:
   - `npm run start`

## Notes

- The SQLite database file is created under `server/data/` (see `DB_PATH` in `.env`).
- User `max` is always treated as `admin`.
