
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import 'bootstrap/dist/css/bootstrap.min.css';
import "flatpickr/dist/themes/material_blue.css";
import "flatpickr/dist/plugins/monthSelect/style.css";
import "simplebar-react/dist/simplebar.min.css";
import "@fortune-sheet/react/dist/index.css"
import './main.css'
import { AuthProvider } from './context/AuthContext.jsx';
import { BrowserRouter } from 'react-router-dom'
import { NotificationProvider } from './context/NotificationContext.jsx';



// Register StreamSaver Service Worker for native streaming downloads
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/streamsaver-sw.js', { scope: '/' });
      if (navigator.serviceWorker.controller) {
        window.__swReady = true;
      }
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.__swReady = true;
      });
    } catch (err) {
      // console.warn('[SW] Registration failed:', err);
    }
  });
}

createRoot(document.getElementById('root')).render(

  <BrowserRouter>
    <NotificationProvider>
      <AuthProvider>

        <App />
      </AuthProvider>
    </NotificationProvider>
  </BrowserRouter>


)