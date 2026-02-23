import React from 'react';
import { createRoot } from 'react-dom/client';
import { CvPage } from '../pages/CvPage.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CvPage />
  </React.StrictMode>
);
