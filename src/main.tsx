import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('✅ React DOM inizializzato'); 

createRoot(document.getElementById("root")!).render(<App />);