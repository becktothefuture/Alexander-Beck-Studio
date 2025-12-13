// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         CONTROL PANEL HTML TEMPLATE                          ║
// ║                  Modern glassmorphism design system                          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export const PANEL_HTML = `
  <!-- Screen reader announcements -->
  <div role="status" aria-live="polite" aria-atomic="true" class="sr-only" id="announcer"></div>
  
  <div class="panel-content">
  
  <!-- Theme Segment Control -->
  <div class="panel-section">
    <div class="section-title">🎨 Theme</div>
    <div class="theme-segment-control" role="group" aria-label="Theme selector">
      <button id="themeAuto" class="theme-segment-btn" aria-label="Auto theme">Auto</button>
      <button id="themeLight" class="theme-segment-btn active" aria-label="Light theme">Light</button>
      <button id="themeDark" class="theme-segment-btn" aria-label="Dark theme">Dark</button>
    </div>
    <div id="themeStatus" class="panel-status">☀️ Light Mode</div>
  </div>
  
  <!-- Mode Switcher -->
  <div class="panel-section">
    <div class="section-title">Mode</div>
    <div class="mode-switcher" role="group" aria-label="Simulation mode selector">
      <button class="mode-button" data-mode="pit" aria-label="Ball Pit mode">🎯 Pit</button>
      <button class="mode-button active" data-mode="flies" aria-label="Flies mode">🕊️ Flies</button>
      <button class="mode-button" data-mode="weightless" aria-label="Zero-G mode">🌌 Zero-G</button>
      <button class="mode-button" data-mode="water" aria-label="Water mode">🌊 Water</button>
      <button class="mode-button" data-mode="vortex" aria-label="Vortex mode">🌀 Vortex</button>
      <button class="mode-button" data-mode="ping-pong" aria-label="Ping Pong mode">🏓 Pong</button>
      <button class="mode-button" data-mode="magnetic" aria-label="Magnetic mode">🧲 Magnet</button>
      <button class="mode-button" data-mode="bubbles" aria-label="Bubbles mode">🫧 Bubbles</button>
    </div>
  </div>
  
  <!-- Global Ball Properties -->
  <details open>
    <summary>Global Properties</summary>
    <div class="group">
      <label>
        <span>Size<span class="val" id="sizeValGlobal">1.2</span></span>
        <input type="range" id="sizeSliderGlobal" min="0.1" max="6.0" step="0.05" value="1.2">
      </label>
      <label>
        <span>Softness<span class="val" id="ballSoftnessValGlobal">20</span></span>
        <input type="range" id="ballSoftnessSliderGlobal" min="0" max="100" step="1" value="20">
      </label>
    </div>
  </details>
  
  <!-- Colors -->
  <details>
    <summary>Colors</summary>
    <div class="group">
      <label>
        <span>Color Template</span>
        <select id="colorSelect"></select>
      </label>
    </div>
  </details>
  
  <!-- Rubber Walls -->
  <details>
    <summary>Walls</summary>
    <div class="group">
      <label>
        <span>Thickness<span class="val" id="wallThicknessVal">12</span></span>
        <input type="range" id="wallThicknessSlider" min="0" max="40" step="1" value="12">
      </label>
      <label>
        <span>Softness<span class="val" id="wallSoftnessVal">20</span></span>
        <input type="range" id="wallSoftnessSlider" min="0" max="60" step="1" value="20">
      </label>
      <label>
        <span>Corner Radius<span class="val" id="wallRadiusVal">42</span></span>
        <input type="range" id="wallRadiusSlider" min="0" max="80" step="2" value="42">
      </label>
      <label>
        <span>Bounce Flash<span class="val" id="wallBounceHighlightVal">0.30</span></span>
        <input type="range" id="wallBounceHighlightSlider" min="0" max="1" step="0.05" value="0.3">
      </label>
    </div>
  </details>
  
  <!-- Visual Effects -->
  <details>
    <summary>Effects</summary>
    <div class="group">
      <div class="section-title">Noise Texture</div>
      <label>
        <span>Back Size<span class="val" id="noiseSizeBaseVal">100</span></span>
        <input type="range" id="noiseSizeBaseSlider" min="50" max="200" step="5" value="100">
      </label>
      <label>
        <span>Front Size<span class="val" id="noiseSizeTopVal">80</span></span>
        <input type="range" id="noiseSizeTopSlider" min="40" max="150" step="5" value="80">
      </label>
      <label>
        <span>Back Opacity<span class="val" id="noiseBackOpacityVal">0.015</span></span>
        <input type="range" id="noiseBackOpacitySlider" min="0" max="0.1" step="0.001" value="0.015">
      </label>
      <label>
        <span>Front Opacity<span class="val" id="noiseFrontOpacityVal">0.010</span></span>
        <input type="range" id="noiseFrontOpacitySlider" min="0" max="0.05" step="0.001" value="0.01">
      </label>
      
      <div class="section-title" style="margin-top: 12px;">Vignette</div>
      <label>
        <span>Light Intensity<span class="val" id="vignetteLightIntensityVal">0.08</span></span>
        <input type="range" id="vignetteLightIntensitySlider" min="0" max="1" step="0.01" value="0.08">
      </label>
      <label>
        <span>Dark Intensity<span class="val" id="vignetteDarkIntensityVal">0.05</span></span>
        <input type="range" id="vignetteDarkIntensitySlider" min="0" max="1" step="0.01" value="0.05">
      </label>
      <label>
        <span>Outer Blur<span class="val" id="vignetteBlurOuterVal">180</span></span>
        <input type="range" id="vignetteBlurOuterSlider" min="0" max="400" step="10" value="180">
      </label>
      <label>
        <span>Mid Blur<span class="val" id="vignetteBlurMidVal">100</span></span>
        <input type="range" id="vignetteBlurMidSlider" min="0" max="300" step="10" value="100">
      </label>
      <label>
        <span>Inner Blur<span class="val" id="vignetteBlurInnerVal">40</span></span>
        <input type="range" id="vignetteBlurInnerSlider" min="0" max="200" step="5" value="40">
      </label>
    </div>
  </details>
  
  <!-- Mode-specific Controls -->
  <div id="pitControls" class="mode-controls">
    <details open>
      <summary>Ball Pit Settings</summary>
      <div class="group">
        <label>
          <span>Gravity<span class="val" id="gravityPitVal">1.10</span></span>
          <input type="range" id="gravityPitSlider" min="0.0" max="2.0" step="0.05" value="1.10">
        </label>
        <label>
          <span>Weight<span class="val" id="weightPitVal">129</span></span>
          <input type="range" id="weightPitSlider" min="10.0" max="200.0" step="1.0" value="129">
        </label>
        <label>
          <span>Bounciness<span class="val" id="restitutionVal">0.69</span></span>
          <input type="range" id="restitutionSlider" min="0.00" max="1.00" step="0.01" value="0.69">
        </label>
        <label>
          <span>Air Friction<span class="val" id="frictionVal">0.0060</span></span>
          <input type="range" id="frictionSlider" min="0.000" max="0.010" step="0.0005" value="0.0060">
        </label>
        <label>
          <span>Repel Size<span class="val" id="repelSizeVal">120</span></span>
          <input type="range" id="repelSizeSlider" min="50" max="1000" step="5" value="120">
        </label>
        <label>
          <span>Repel Power<span class="val" id="repelPowerVal">8500</span></span>
          <input type="range" id="repelPowerSlider" min="0" max="10000" step="100" value="8500">
        </label>
      </div>
    </details>
  </div>
  
  <div id="fliesControls" class="mode-controls active">
    <details open>
      <summary>Flies Settings</summary>
      <div class="group">
        <label>
          <span>Ball Count<span class="val" id="fliesBallCountVal">60</span></span>
          <input type="range" id="fliesBallCountSlider" min="20" max="150" step="5" value="60">
        </label>
        <label>
          <span>Attraction<span class="val" id="attractPowerVal">5000</span></span>
          <input type="range" id="attractPowerSlider" min="100" max="8000" step="50" value="5000">
        </label>
        <label>
          <span>Swarm Speed<span class="val" id="swarmSpeedVal">0.4</span></span>
          <input type="range" id="swarmSpeedSlider" min="0.2" max="5.0" step="0.1" value="0.4">
        </label>
        <label>
          <span>Separation<span class="val" id="fliesSeparationVal">15000</span></span>
          <input type="range" id="fliesSeparationSlider" min="5000" max="30000" step="1000" value="15000">
        </label>
      </div>
    </details>
  </div>
  
  <div id="weightlessControls" class="mode-controls">
    <details open>
      <summary>Zero-G Settings</summary>
      <div class="group">
        <label>
          <span>Ball Count<span class="val" id="weightlessCountVal">80</span></span>
          <input type="range" id="weightlessCountSlider" min="20" max="200" step="10" value="80">
        </label>
        <label>
          <span>Initial Speed<span class="val" id="weightlessSpeedVal">250</span></span>
          <input type="range" id="weightlessSpeedSlider" min="100" max="600" step="25" value="250">
        </label>
        <label>
          <span>Bounce<span class="val" id="weightlessBounceVal">0.95</span></span>
          <input type="range" id="weightlessBounceSlider" min="0.5" max="1.0" step="0.05" value="0.95">
        </label>
      </div>
    </details>
  </div>
  
  <div id="waterControls" class="mode-controls">
    <details open>
      <summary>Water Settings</summary>
      <div class="group">
        <label>
          <span>Ball Count<span class="val" id="waterBallCountVal">300</span></span>
          <input type="range" id="waterBallCountSlider" min="50" max="400" step="10" value="300">
        </label>
        <label>
          <span>Ripple Strength<span class="val" id="waterRippleStrengthVal">18000</span></span>
          <input type="range" id="waterRippleStrengthSlider" min="5000" max="30000" step="1000" value="18000">
        </label>
        <label>
          <span>Motion<span class="val" id="waterMotionVal">40</span></span>
          <input type="range" id="waterMotionSlider" min="0" max="80" step="1" value="40">
        </label>
      </div>
    </details>
  </div>
  
  <div id="vortexControls" class="mode-controls">
    <details open>
      <summary>Vortex Settings</summary>
      <div class="group">
        <label>
          <span>Ball Count<span class="val" id="vortexBallCountVal">180</span></span>
          <input type="range" id="vortexBallCountSlider" min="50" max="300" step="10" value="180">
        </label>
        <label>
          <span>Swirl Strength<span class="val" id="vortexSwirlVal">420</span></span>
          <input type="range" id="vortexSwirlSlider" min="100" max="800" step="20" value="420">
        </label>
        <label>
          <span>Radial Pull<span class="val" id="vortexPullVal">180</span></span>
          <input type="range" id="vortexPullSlider" min="0" max="400" step="10" value="180">
        </label>
      </div>
    </details>
  </div>
  
  <div id="ping-pongControls" class="mode-controls">
    <details open>
      <summary>Ping Pong Settings</summary>
      <div class="group">
        <label>
          <span>Ball Count<span class="val" id="pingPongBallCountVal">35</span></span>
          <input type="range" id="pingPongBallCountSlider" min="10" max="100" step="5" value="35">
        </label>
        <label>
          <span>Ball Speed<span class="val" id="pingPongSpeedVal">800</span></span>
          <input type="range" id="pingPongSpeedSlider" min="200" max="1200" step="50" value="800">
        </label>
        <label>
          <span>Cursor Size<span class="val" id="pingPongCursorVal">50</span></span>
          <input type="range" id="pingPongCursorSlider" min="20" max="200" step="10" value="50">
        </label>
      </div>
    </details>
  </div>
  
  <div id="magneticControls" class="mode-controls">
    <details open>
      <summary>Magnetic Settings</summary>
      <div class="group">
        <label>
          <span>Ball Count<span class="val" id="magneticBallCountVal">180</span></span>
          <input type="range" id="magneticBallCountSlider" min="50" max="300" step="10" value="180">
        </label>
        <label>
          <span>Strength<span class="val" id="magneticStrengthVal">65000</span></span>
          <input type="range" id="magneticStrengthSlider" min="10000" max="100000" step="5000" value="65000">
        </label>
        <label>
          <span>Max Velocity<span class="val" id="magneticVelocityVal">2800</span></span>
          <input type="range" id="magneticVelocitySlider" min="500" max="4000" step="100" value="2800">
        </label>
      </div>
    </details>
  </div>
  
  <div id="bubblesControls" class="mode-controls">
    <details open>
      <summary>Bubbles Settings</summary>
      <div class="group">
        <label>
          <span>Bubble Rate<span class="val" id="bubblesRateVal">8</span></span>
          <input type="range" id="bubblesRateSlider" min="1" max="20" step="1" value="8">
        </label>
        <label>
          <span>Rise Speed<span class="val" id="bubblesSpeedVal">150</span></span>
          <input type="range" id="bubblesSpeedSlider" min="50" max="400" step="25" value="150">
        </label>
        <label>
          <span>Wobble<span class="val" id="bubblesWobbleVal">40</span></span>
          <input type="range" id="bubblesWobbleSlider" min="0" max="100" step="5" value="40">
        </label>
        <label>
          <span>Max Bubbles<span class="val" id="bubblesMaxVal">150</span></span>
          <input type="range" id="bubblesMaxSlider" min="50" max="300" step="10" value="150">
        </label>
        <label>
          <span>Cursor Deflection<span class="val" id="bubblesDeflectVal">80</span></span>
          <input type="range" id="bubblesDeflectSlider" min="20" max="150" step="10" value="80">
        </label>
      </div>
    </details>
  </div>
  
  <!-- Save Config -->
  <div class="panel-section panel-section--action">
    <button id="saveConfigBtn" class="primary">💾 Save Config</button>
  </div>
  
  <!-- Keyboard shortcuts -->
  <div class="panel-footer">
    <kbd>R</kbd> reset · <kbd>/</kbd> panel · click cycles modes
  </div>
  
  </div>
`;
