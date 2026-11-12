import '@fontsource/barlow/400.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow/800.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/800.css'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
