import { AboutNarrativePointWorld3D } from './AboutNarrativePointWorld3D.jsx';

export const DEFAULT_ABOUT_NARRATIVE_WORLD = 'three-point-world-v1';

function ThreePointWorld({ assetRoot, rootRef, interactionRef, runtimeRef, pointProfile, layoutProfile }) {
  return (
    <div className="about-narrative-world" data-world-implementation={DEFAULT_ABOUT_NARRATIVE_WORLD} aria-hidden="true">
      <AboutNarrativePointWorld3D assetRoot={assetRoot} rootRef={rootRef} interactionRef={interactionRef} runtimeRef={runtimeRef} pointProfile={pointProfile} layoutProfile={layoutProfile} />
    </div>
  );
}

export const ABOUT_NARRATIVE_WORLD_RENDERERS = Object.freeze({
  [DEFAULT_ABOUT_NARRATIVE_WORLD]: ThreePointWorld,
});

export function AboutNarrativeWorld({
  assetRoot,
  rendererId = DEFAULT_ABOUT_NARRATIVE_WORLD,
  rootRef,
  interactionRef,
  runtimeRef,
  pointProfile = '',
  layoutProfile = '',
}) {
  const Renderer = ABOUT_NARRATIVE_WORLD_RENDERERS[rendererId]
    || ABOUT_NARRATIVE_WORLD_RENDERERS[DEFAULT_ABOUT_NARRATIVE_WORLD];
  return <Renderer assetRoot={assetRoot} rootRef={rootRef} interactionRef={interactionRef} runtimeRef={runtimeRef} pointProfile={pointProfile} layoutProfile={layoutProfile} />;
}
