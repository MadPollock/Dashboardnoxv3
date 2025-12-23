import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/index.css';

// Wait for config to load before rendering app
function waitForConfig() {
  return new Promise<void>((resolve) => {
    // Check if config is already loaded
    if (window.__CROSSRAMP_CONFIG__) {
      resolve();
      return;
    }

    // Wait for config.js script to load
    const checkConfig = () => {
      if (window.__CROSSRAMP_CONFIG__) {
        resolve();
      } else {
        // Check again in 50ms
        setTimeout(checkConfig, 50);
      }
    };

    // Start checking after a short delay to let script tag execute
    setTimeout(checkConfig, 10);
  });
}

// Initialize app after config loads
waitForConfig().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
