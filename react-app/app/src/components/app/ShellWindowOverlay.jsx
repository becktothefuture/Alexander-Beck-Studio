function dispatchWindowOverlayDismiss(event) {
  const target = event.target?.closest ? event.target : event.target?.parentElement;
  if (!target?.closest) return;
  if (target.closest('button, input, a, select, textarea')) return;

  const contentLayer = event.currentTarget;
  const modalHost = contentLayer.querySelector('#window-overlay-modal-host');
  const isDismissSurface = target === contentLayer
    || target === modalHost;

  if (isDismissSurface) {
    document.dispatchEvent(new CustomEvent('modal-overlay-dismiss', {
      detail: { instant: false },
    }));
  }
}

export function ShellWindowOverlay({ children }) {
  return (
    <>
      <div
        id="window-overlay-blur-layer"
        className="window-overlay-layer window-overlay-blur-layer"
        aria-hidden="true"
      />
      <div
        id="window-overlay-content-layer"
        className="window-overlay-layer window-overlay-content-layer"
        onClick={dispatchWindowOverlayDismiss}
      >
        <div id="window-overlay-modal-host" className="window-overlay-modal-host">
          {children}
        </div>
      </div>
    </>
  );
}
