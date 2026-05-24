import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import SimpleApp from './SimpleApp.tsx';
import './styles.css';

const RouteApp = window.location.pathname === '/simple' ? SimpleApp : App;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouteApp />
  </React.StrictMode>
);
