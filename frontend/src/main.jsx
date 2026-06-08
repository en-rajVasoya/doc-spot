
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


// if ('serviceWorker' in navigator) {
//     navigator.serviceWorker.register('/streamsaver-sw.js')
// }


createRoot(document.getElementById('root')).render(


  <NotificationProvider>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </NotificationProvider>

)