import { NapoleonPointCloud } from '../napoleon-point-cloud/NapoleonPointCloud.jsx';
import { AboutNarrativePointField } from './AboutNarrativePointField.jsx';

export const DEFAULT_ABOUT_NARRATIVE_WORLD = 'procedural-points-v1';

function ProceduralPointsWorld({ rootRef, scrollportRef, settings }) {
  return (
    <div className="about-narrative-world" data-world-implementation="procedural-points-v1" aria-hidden="true">
      <AboutNarrativePointField rootRef={rootRef} scrollportRef={scrollportRef} settings={settings} />

      <div className="about-narrative-bust" data-placeholder-geometry="napoleon">
        <NapoleonPointCloud
          quality="medium"
          mobileQuality="low"
          pointDensity={0.62}
          dotSize={13}
          dotOpacity={0.88}
          autoRotate
          rotationSpeed={0.026}
          interactionStrength={0.18}
          spread={0.025}
          focus={1.08}
          breathingMotion={0.18}
          depthFogStart={0.9}
          depthFogMin={0.24}
          maxDpr={1.25}
          decorative
        />
      </div>
    </div>
  );
}

export const ABOUT_NARRATIVE_WORLD_RENDERERS = Object.freeze({
  [DEFAULT_ABOUT_NARRATIVE_WORLD]: ProceduralPointsWorld,
});

export function AboutNarrativeWorld({
  rendererId = DEFAULT_ABOUT_NARRATIVE_WORLD,
  rootRef,
  scrollportRef,
  settings,
}) {
  const Renderer = ABOUT_NARRATIVE_WORLD_RENDERERS[rendererId]
    || ABOUT_NARRATIVE_WORLD_RENDERERS[DEFAULT_ABOUT_NARRATIVE_WORLD];
  return <Renderer rootRef={rootRef} scrollportRef={scrollportRef} settings={settings} />;
}
