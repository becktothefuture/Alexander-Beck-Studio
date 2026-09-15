import { useEffect, useRef } from 'react';
import { FANCY_SIMULATION_PROFILES } from './fancySimulationProfiles.js';

export function FancyStudyNotes({ simulation, label, close }) {
  const dialogRef = useRef(null);
  useEffect(() => { dialogRef.current?.showModal(); }, []);

  return (
    <dialog ref={dialogRef} className="fancy-study-notes" aria-labelledby="fancy-study-title" onClose={close}>
      <div className="fancy-study-notes__header">
        <span>Studio study · 4 views · 10 Home simulations</span>
        <button type="button" aria-label="Close study notes" onClick={() => dialogRef.current.close()}>×</button>
      </div>
      <div className="fancy-study-notes__body">
        <h1 id="fancy-study-title">Four ways to make a mark.</h1>
        <p>The original balls make individual movement clearer. Fancy Mode gives the whole field a more distinctive visual identity, with six expertise patterns and short trails.</p>
        <p>Your starting grid is 15 pixels on every screen, with full cell fill, 85% coverage and complete grid alignment. Geometric, Rounded, Diagonal and Bold use the same six simple marks. Each mark keeps its palette colour, with a second colour only in the split disc. The legend always uses the same marks as the field.</p>
        <h2>How it works</h2>
        <ol>
          <li><strong>Move the particles.</strong> The same invisible bodies still fall, flock, collide and respond to you.</li>
          <li><strong>Sample a grid.</strong> Each cell looks at the nearby bodies. The strongest body supplies its expertise pattern and colour.</li>
          <li><strong>Stamp the marks.</strong> A small sheet of ready-made shapes supplies the picture. Marks grow, shift slightly and fade as the bodies pass.</li>
        </ol>
        <p>The shapes are prepared once per palette, background or pattern change. Home, Work and Contact stamp them onto their existing canvas. About keeps the process on the GPU: it draws a tiny image of the 3D scene, then turns each pixel into a pattern. Its small history buffers let marks fade without reading pixels back into JavaScript.</p>
        <h2>{label}</h2>
        <p>{FANCY_SIMULATION_PROFILES[simulation]?.note} Turn off “Adapt to simulation” in Tune to compare the shared settings.</p>
        <h2>Make it yours</h2>
        <p>Use the site’s Home, Work, About and Contact buttons to explore. Tune shows all four existing colour palettes, their local-time slots and paired patterns. Follow colours changes both together. Select a pattern family to pin it, or turn Follow colours back on to restore the pairings.</p>
        <p>The selected wave strength is zero. Mouse, touch and opening switches remain enabled, but no waves are drawn until you raise Strength. The black/white switch and original-material comparison work across all four views. Your settings follow you and stay in the share link.</p>
        <p className="fancy-study-notes__caption">An isolated prototype. Settings stay in this page’s link.</p>
      </div>
    </dialog>
  );
}
