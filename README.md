# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/c8439c3e-00e6-4c23-bbff-1b7876021ebc

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/c8439c3e-00e6-4c23-bbff-1b7876021ebc) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/c8439c3e-00e6-4c23-bbff-1b7876021ebc) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Spielmodus & Toggles

- **Modus-Schalter** – wechsle zwischen „Playground“ (autonomes Lernen) und „Spielmodus“ (manuelle Steuerung, Ziele erreichen, Highscores speichern).
- **Werte anzeigen** – blendet für jedes Feld Q-Werte bzw. Tile-Reward als Badge ein (`Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })`).
- **Tile-Größe & Level** – vier Größen (S–XL) und drei Level-Presets mit eigener Dichte an Hindernissen, Rewards, Punishments und Zielen.
- **HUD & Legende** – Sticky-HUD zeigt Score, Züge, Timer & Bestwerte; Farblegende erläutert Agent, Ziel, Reward, Strafe, Hindernis.
- **Steuerung** – Pfeiltasten/WASD oder die On-Screen-Buttons bewegen den Agent. Hindernisse blockieren, Strafen ziehen Punkte ab, Rewards addieren, Ziele beenden den Lauf.
- **Victory-Modal & Highscore** – bei Ziel-Erfolg erscheint eine Auswertung (Züge, Score, Rewards, Strafen, Zeit) und Highscores werden pro Level in `localStorage` gespeichert.
