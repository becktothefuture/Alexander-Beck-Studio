import { createRoot } from 'react-dom/client';
import { SiteApp } from '../components/app/SiteApp.jsx';

async function mountSite() {
  if ((import.meta.env.MODE === 'development' || import.meta.env.MODE === 'certification')
    && window.frameElement?.hasAttribute('data-fancy-preview')) {
    const { initializeFancyPreview } = await import('../routes/fancy-mode/fancyPreview.js');
    initializeFancyPreview();
  }
  createRoot(document.getElementById('root')).render(<SiteApp />);
}

mountSite();
