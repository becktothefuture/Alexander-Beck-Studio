import React from 'react';
import { createRoot } from 'react-dom/client';
import { PortfolioPage } from '../pages/PortfolioPage.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PortfolioPage />
  </React.StrictMode>
);
