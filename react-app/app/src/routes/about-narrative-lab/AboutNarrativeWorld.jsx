import { AboutNarrativePointWorld3D } from './AboutNarrativePointWorld3D.jsx';

export const DEFAULT_ABOUT_NARRATIVE_WORLD = 'three-point-world-v1';

function ThreePointWorld({ rootRef, interactionRef, runtimeRef }) {
  return (
    <div className="about-narrative-world" data-world-implementation={DEFAULT_ABOUT_NARRATIVE_WORLD} aria-hidden="true">
      <AboutNarrativePointWorld3D rootRef={rootRef} interactionRef={interactionRef} runtimeRef={runtimeRef} />
    </div>
  );
}

export const ABOUT_NARRATIVE_WORLD_RENDERERS = Object.freeze({
  [DEFAULT_ABOUT_NARRATIVE_WORLD]: ThreePointWorld,
});

export function AboutNarrativeWorld({
  rendererId = DEFAULT_ABOUT_NARRATIVE_WORLD,
  rootRef,
  interactionRef,
  runtimeRef,
}) {
  const Renderer = ABOUT_NARRATIVE_WORLD_RENDERERS[rendererId]
    || ABOUT_NARRATIVE_WORLD_RENDERERS[DEFAULT_ABOUT_NARRATIVE_WORLD];
  return <Renderer rootRef={rootRef} interactionRef={interactionRef} runtimeRef={runtimeRef} />;
}
