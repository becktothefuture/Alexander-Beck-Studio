// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         COMPLETE PANEL HTML TEMPLATE                         ║
// ║                 Extracted from balls-source.html lines 246-720               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export const PANEL_HTML = `
  <!-- Draggable header -->
  <div class="panel-header" id="panelHeader" role="banner">
    <span><span class="drag-handle" aria-hidden="true">⋮⋮</span>Controls</span>
    <button style="cursor: pointer; opacity: 0.7; background: none; border: none; color: inherit; font-size: 16px; padding: 0;" id="minimizePanel" title="Toggle panel" aria-label="Toggle control panel" aria-expanded="true">−</button>
  </div>
  
  <!-- Screen reader announcements -->
  <div role="status" aria-live="polite" aria-atomic="true" style="position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;" id="announcer"></div>
  
  <div class="panel-content">
  
  <!-- Theme Segment Control -->
  <div style="margin-bottom: 12px; padding: 8px; background: rgba(100,100,255,0.15); border-radius: 4px; border: 1px solid rgba(100,100,255,0.3);">
    <div style="font-weight: 600; font-size: 11px; margin-bottom: 8px;">🎨 Theme</div>
    <div class="theme-segment-control" role="group" aria-label="Theme selector">
      <button id="themeAuto" class="theme-segment-btn" aria-label="Auto theme">Auto</button>
      <button id="themeLight" class="theme-segment-btn active" aria-label="Light theme">Light</button>
      <button id="themeDark" class="theme-segment-btn" aria-label="Dark theme">Dark</button>
    </div>
    <div id="themeStatus" style="font-size: 9px; margin-top: 8px; padding: 4px; background: rgba(0,0,0,0.2); border-radius: 3px; font-family: monospace; text-align: center;">
      ☀️ Light Mode
    </div>
  </div>
  
  <!-- GLOBAL SETTINGS -->
  <details open>
    <summary>🌐 Global Ball Properties</summary>
    <div class="group">
        <label title="Global ball size scale (0.1-6.0)">Size: <span class="val" id="sizeValGlobal">1.2</span><input type="range" id="sizeSliderGlobal" min="0.1" max="6.0" step="0.05" value="1.2"></label>
        <label title="Ball deformation (0-100)">Softness: <span class="val" id="ballSoftnessValGlobal">20</span><input type="range" id="ballSoftnessSliderGlobal" min="0" max="100" step="1" value="20"></label>
    </div>
  </details>
  
  <!-- Frame/Border Settings -->
  <details>
    <summary>🖼️ Frame Border</summary>
    <div class="group">
        <label><span>Border thickness (px)</span><input type="range" id="framePadSlider" min="0" max="100" step="1" value="0"><span class="val" id="framePadVal">0</span></label>
        <div style="font-size: 9px; opacity: 0.7; margin-top: 6px;">Reveals background color around rounded container</div>
    </div>
  </details>
  
  <!-- Build Controls -->
  <div style="margin-bottom: 12px; padding: 8px; background: rgba(0,255,0,0.1); border-radius: 4px; text-align: center;">
    <button id="saveConfigBtn" style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">💾 Save Config</button>
    <div style="font-size: 9px; opacity: 0.7; margin-top: 6px;">Save downloads current-config.json</div>
  </div>
  
  <details open>
    <summary>🎨 Colors</summary>
    <div class="group">
        <label>Color template: <select id="colorSelect"></select></label>
    </div>
  </details>
  
  <div style="margin: 20px 0; padding: 12px 0; border-top: 1px solid rgba(255,255,255,0.15);">
    <div style="text-align: center; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; margin-bottom: 12px;">
      Mode Settings
    </div>
    
    <!-- Mode Switcher -->
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
  
  <div id="pitControls" class="mode-controls">
    <details open>
      <summary>🎯 Ball Pit Mode</summary>
      <div class="group">
        <label><span>Gravity (×Earth)</span><input type="range" id="gravityPitSlider" min="0.0" max="2.0" step="0.05" value="1.10"><span class="val" id="gravityPitVal">1.10</span></label>
        <label><span>Weight (grams)</span><input type="range" id="weightPitSlider" min="10.0" max="200.0" step="1.0" value="129"><span class="val" id="weightPitVal">129</span></label>
        <label><span>Bounciness</span><input type="range" id="restitutionSlider" min="0.00" max="1.00" step="0.01" value="0.69"><span class="val" id="restitutionVal">0.69</span></label>
        <label><span>Air friction</span><input type="range" id="frictionSlider" min="0.000" max="0.010" step="0.0005" value="0.0060"><span class="val" id="frictionVal">0.0060</span></label>
      </div>
    </details>
    <details open>
      <summary>🧲 Mouse Repeller</summary>
      <div class="group">
        <label><span>Repel size (px)</span><input type="range" id="repelSizeSlider" min="50" max="1000" step="5" value="120"><span class="val" id="repelSizeVal">120</span></label>
        <label><span>Repel power</span><input type="range" id="repelPowerSlider" min="0" max="10000" step="100" value="8500"><span class="val" id="repelPowerVal">274000</span></label>
      </div>
    </details>
  </div>
  
  <div id="fliesControls" class="mode-controls active">
    <details open>
      <summary>🕊️ Flies to Light Mode</summary>
      <div class="group">
        <label><span>Ball count</span><input type="range" id="fliesBallCountSlider" min="20" max="150" step="5" value="60"><span class="val" id="fliesBallCountVal">60</span></label>
        <label><span>Attraction power</span><input type="range" id="attractPowerSlider" min="100" max="8000" step="50" value="5000"><span class="val" id="attractPowerVal">5000</span></label>
        <label><span>Swarm speed (×)</span><input type="range" id="swarmSpeedSlider" min="0.2" max="5.0" step="0.1" value="0.4"><span class="val" id="swarmSpeedVal">0.4</span></label>
        <label><span>Separation force</span><input type="range" id="fliesSeparationSlider" min="5000" max="30000" step="1000" value="15000"><span class="val" id="fliesSeparationVal">15000</span></label>
      </div>
    </details>
  </div>
  
  <div id="weightlessControls" class="mode-controls">
    <details open>
      <summary>🌌 Zero-G Mode</summary>
      <div class="group">
        <label><span>Ball count</span><input type="range" id="weightlessCountSlider" min="20" max="200" step="10" value="80"><span class="val" id="weightlessCountVal">80</span></label>
        <label><span>Initial speed</span><input type="range" id="weightlessSpeedSlider" min="100" max="600" step="25" value="250"><span class="val" id="weightlessSpeedVal">250</span></label>
        <label><span>Bounce</span><input type="range" id="weightlessBounceSlider" min="0.5" max="1.0" step="0.05" value="0.95"><span class="val" id="weightlessBounceVal">0.95</span></label>
      </div>
    </details>
  </div>
  
  <div id="waterControls" class="mode-controls">
    <details open>
      <summary>🌊 Water Swimming Mode</summary>
      <div class="group">
        <label><span>Ball count</span><input type="range" id="waterBallCountSlider" min="50" max="400" step="10" value="300"><span class="val" id="waterBallCountVal">300</span></label>
        <label><span>Ripple strength</span><input type="range" id="waterRippleStrengthSlider" min="5000" max="30000" step="1000" value="18000"><span class="val" id="waterRippleStrengthVal">18000</span></label>
        <label><span>Motion intensity</span><input type="range" id="waterMotionSlider" min="0" max="80" step="1" value="40"><span class="val" id="waterMotionVal">40</span></label>
        <div style="font-size: 9px; opacity: 0.7; margin-top: 6px;">Move your cursor to create ripples</div>
      </div>
    </details>
  </div>
  
  <div id="vortexControls" class="mode-controls">
    <details open>
      <summary>🌀 Vortex Sheets Mode</summary>
      <div class="group">
        <label><span>Ball count</span><input type="range" id="vortexBallCountSlider" min="50" max="300" step="10" value="180"><span class="val" id="vortexBallCountVal">180</span></label>
        <label><span>Swirl strength</span><input type="range" id="vortexSwirlSlider" min="100" max="800" step="20" value="420"><span class="val" id="vortexSwirlVal">420</span></label>
        <label><span>Radial pull</span><input type="range" id="vortexPullSlider" min="0" max="400" step="10" value="180"><span class="val" id="vortexPullVal">180</span></label>
        <div style="font-size: 9px; opacity: 0.7; margin-top: 6px;">Move cursor to create vortex</div>
      </div>
    </details>
  </div>
  
  <div id="ping-pongControls" class="mode-controls">
    <details open>
      <summary>🏓 Ping Pong Mode</summary>
      <div class="group">
        <label><span>Ball count</span><input type="range" id="pingPongBallCountSlider" min="10" max="100" step="5" value="35"><span class="val" id="pingPongBallCountVal">35</span></label>
        <label><span>Ball speed</span><input type="range" id="pingPongSpeedSlider" min="200" max="1200" step="50" value="800"><span class="val" id="pingPongSpeedVal">800</span></label>
        <label><span>Cursor obstacle size</span><input type="range" id="pingPongCursorSlider" min="20" max="200" step="10" value="50"><span class="val" id="pingPongCursorVal">50</span></label>
        <div style="font-size: 9px; opacity: 0.7; margin-top: 6px;">Continuous motion • Cursor deflects balls</div>
      </div>
    </details>
  </div>
  
  <div id="magneticControls" class="mode-controls">
    <details open>
      <summary>🧲 Magnetic Mode</summary>
      <div class="group">
        <label><span>Ball count</span><input type="range" id="magneticBallCountSlider" min="50" max="300" step="10" value="180"><span class="val" id="magneticBallCountVal">180</span></label>
        <label><span>Magnetic strength</span><input type="range" id="magneticStrengthSlider" min="10000" max="100000" step="5000" value="65000"><span class="val" id="magneticStrengthVal">65000</span></label>
        <label><span>Max velocity</span><input type="range" id="magneticVelocitySlider" min="500" max="4000" step="100" value="2800"><span class="val" id="magneticVelocityVal">2800</span></label>
        <div style="font-size: 9px; opacity: 0.7; margin-top: 6px;">Cursor drives magnetic swirls (no explosions)</div>
      </div>
    </details>
  </div>
  
  <div id="bubblesControls" class="mode-controls">
    <details open>
      <summary>🫧 Carbonated Bubbles Mode</summary>
      <div class="group">
        <label><span>Bubble rate</span><input type="range" id="bubblesRateSlider" min="1" max="20" step="1" value="8"><span class="val" id="bubblesRateVal">8</span></label>
        <label><span>Rise speed</span><input type="range" id="bubblesSpeedSlider" min="50" max="400" step="25" value="150"><span class="val" id="bubblesSpeedVal">150</span></label>
        <label><span>Wobble</span><input type="range" id="bubblesWobbleSlider" min="0" max="100" step="5" value="40"><span class="val" id="bubblesWobbleVal">40</span></label>
        <label><span>Max bubbles</span><input type="range" id="bubblesMaxSlider" min="50" max="300" step="10" value="150"><span class="val" id="bubblesMaxVal">150</span></label>
        <label><span>Cursor deflection</span><input type="range" id="bubblesDeflectSlider" min="20" max="150" step="10" value="80"><span class="val" id="bubblesDeflectVal">80</span></label>
        <div style="font-size: 9px; opacity: 0.7; margin-top: 6px;">Bubbles rise from bottom • Pop at top • Cursor deflects</div>
      </div>
    </details>
  </div>
  
  <div style="font-size:10px; opacity:0.5; text-align:center; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
    <code>R</code> reset • <code>/</code> panel • click/tap cycles modes
  </div>
  
  </div>
`;
