function getOpenerWindow() {
  try {
    if (!window.opener || window.opener.closed) return null;
    return window.opener;
  } catch {
    return null;
  }
}

function setConnectionLabel(text) {
  const subtitle = document.getElementById('panel-host-window-subtitle');
  if (subtitle) subtitle.textContent = text;
}

function connectToOpener() {
  const openerWindow = getOpenerWindow();
  if (!openerWindow) {
    setConnectionLabel('Waiting for host...');
    return false;
  }

  try {
    const ready = openerWindow.__ABS_PANEL_POPUP_READY__;
    if (typeof ready === 'function') {
      ready(window);
      setConnectionLabel('Connected');
      return true;
    }
  } catch {
    setConnectionLabel('Waiting for host...');
  }

  return false;
}

const retryTimer = window.setInterval(() => {
  if (connectToOpener()) {
    window.clearInterval(retryTimer);
  }
}, 500);

connectToOpener();

window.addEventListener('beforeunload', () => {
  window.clearInterval(retryTimer);
  try {
    const closed = window.opener?.__ABS_PANEL_POPUP_CLOSED__;
    if (typeof closed === 'function') {
      closed();
    }
  } catch {
    // Ignore opener access errors during shutdown.
  }
});
