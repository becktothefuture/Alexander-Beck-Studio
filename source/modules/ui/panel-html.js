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
  
  <!-- 120 FPS Performance Mode Toggle -->
  <div style="margin-bottom: 12px; padding: 8px; background: rgba(255,0,0,0.15); border-radius: 4px; border: 1px solid rgba(255,0,0,0.3);">
    <label style="display: flex; align-items: center; cursor: pointer; font-weight: 600; font-size: 11px;">
      <input type="checkbox" id="performanceModeToggle" style="margin-right: 8px; cursor: pointer;">
      <span>⚡ 120 FPS Performance Mode</span>
    </label>
    <div style="font-size: 9px; opacity: 0.7; margin-top: 6px; line-height: 1.3;">
      Aggressive optimizations: reduces balls, disables glass morphism, targets 120 FPS
    </div>
    <div id="performanceModeStatus" style="font-size: 9px; margin-top: 6px; padding: 4px; background: rgba(0,0,0,0.2); border-radius: 3px; font-family: monospace;">
      🎨 Normal Mode (350 balls)
    </div>
  </div>
  
  <!-- Dark Mode Toggle -->
  <div style="margin-bottom: 12px; padding: 8px; background: rgba(100,100,255,0.15); border-radius: 4px; border: 1px solid rgba(100,100,255,0.3);">
    <label style="display: flex; align-items: center; cursor: pointer; font-weight: 600; font-size: 11px;">
      <input type="checkbox" id="darkModeToggle" style="margin-right: 8px; cursor: pointer;" checked>
      <span>🌙 Auto Dark Mode</span>
    </label>
    <div style="font-size: 9px; opacity: 0.7; margin-top: 6px; line-height: 1.3;">
      Automatically enables dark background from sunset (6 PM) to sunrise (6 AM)
    </div>
    <div id="darkModeStatus" style="font-size: 9px; margin-top: 6px; padding: 4px; background: rgba(0,0,0,0.2); border-radius: 3px; font-family: monospace;">
      ☀️ Day Mode
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
  
  <!-- Build Controls -->
  <div style="margin-bottom: 12px; padding: 8px; background: rgba(0,255,0,0.1); border-radius: 4px; text-align: center;">
    <button id="saveConfigBtn" style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">💾 Save Config</button>
    <div style="font-size: 9px; opacity: 0.7; margin-top: 6px;">Save downloads current-config.json</div>
  </div>
  
  <details open>
    <summary>🎨 Colors</summary>
    <div class="group">
        <label>Color template: <select id="colorSelect"></select></label>
        <label>Color 1 (50%): <input type="color" id="color1" value="#b7bcb7"> <span class="hex-val" id="color1Val">#b7bcb7</span></label>
        <label>Color 2 (25%): <input type="color" id="color2" value="#e4e9e4"> <span class="hex-val" id="color2Val">#e4e9e4</span></label>
        <label>Color 3 (12%): <input type="color" id="color3" value="#ffffff"> <span class="hex-val" id="color3Val">#ffffff</span></label>
        <label>Color 4 (6%): <input type="color" id="color4" value="#00695c"> <span class="hex-val" id="color4Val">#00695c</span></label>
        <label>Color 5 (3%): <input type="color" id="color5" value="#000000"> <span class="hex-val" id="color5Val">#000000</span></label>
        <label>Color 6 (2%): <input type="color" id="color6" value="#ff4013"> <span class="hex-val" id="color6Val">#ff4013</span></label>
        <label>Color 7 (1%): <input type="color" id="color7" value="#0d5cb6"> <span class="hex-val" id="color7Val">#0d5cb6</span></label>
        <label>Color 8 (1%): <input type="color" id="color8" value="#ffa000"> <span class="hex-val" id="color8Val">#ffa000</span></label>
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
      <button class="mode-button" data-mode="pulse-grid" aria-label="Pulse Grid mode">🎹 Pulse</button>
    </div>
  </div>
  
  <div id="pitControls" class="mode-controls">
    <details open>
      <summary>🎯 Ball Pit Mode</summary>
      <div class="group">
        <label><span>Physics template</span><select id="physicsSelect"></select></label>
        <label><span>Gravity (×Earth)</span><input type="range" id="gravityPitSlider" min="0.0" max="2.0" step="0.05" value="1.05"><span class="val" id="gravityPitVal">1.05</span></label>
        <label><span>Weight (grams)</span><input type="range" id="weightPitSlider" min="10.0" max="200.0" step="1.0" value="91"><span class="val" id="weightPitVal">91</span></label>
        <label><span>Bounciness</span><input type="range" id="restitutionSlider" min="0.00" max="1.00" step="0.01" value="0.97"><span class="val" id="restitutionVal">0.97</span></label>
        <label><span>Air friction</span><input type="range" id="frictionSlider" min="0.000" max="0.010" step="0.0005" value="0.0035"><span class="val" id="frictionVal">0.0035</span></label>
      </div>
    </details>
    <details open>
      <summary>🧲 Mouse Repeller</summary>
      <div class="group">
        <label><span>Repeller template</span><select id="repellerSelect"></select></label>
        <label><span>Repel size (px)</span><input type="range" id="repelSizeSlider" min="50" max="1000" step="5" value="710"><span class="val" id="repelSizeVal">710</span></label>
        <label><span>Repel power</span><input type="range" id="repelPowerSlider" min="0" max="10000" step="100" value="7920"><span class="val" id="repelPowerVal">274000</span></label>
      </div>
    </details>
  </div>
  
  <div id="fliesControls" class="mode-controls active">
    <details open>
      <summary>🕊️ Flies to Light Mode</summary>
      <div class="group">
        <label><span>Attraction power</span><input type="range" id="attractPowerSlider" min="100" max="8000" step="50" value="5000"><span class="val" id="attractPowerVal">5000</span></label>
        <label><span>Swarm speed (×)</span><input type="range" id="swarmSpeedSlider" min="0.2" max="5.0" step="0.1" value="0.4"><span class="val" id="swarmSpeedVal">0.4</span></label>
      </div>
    </details>
  </div>
  
  <div id="weightlessControls" class="mode-controls">
    <details open>
      <summary>🌌 Zero-G Mode</summary>
      <div class="group">
        <label><span>Ball count</span><input type="range" id="weightlessCountSlider" min="20" max="200" step="10" value="80"><span class="val" id="weightlessCountVal">80</span></label>
        <label><span>Initial speed</span><input type="range" id="weightlessSpeedSlider" min="100" max="600" step="25" value="250"><span class="val" id="weightlessSpeedVal">250</span></label>
      </div>
    </details>
  </div>
  
  <div id="pulseGridControls" class="mode-controls">
    <details open>
      <summary>🎹 Pulse Grid Mode</summary>
      <div class="group">
        <label><span>Grid columns</span><input type="range" id="gridColumnsSlider" min="20" max="80" step="5" value="40"><span class="val" id="gridColumnsVal">40</span></label>
        <label><span>Ball count</span><input type="range" id="gridBallCountSlider" min="40" max="200" step="10" value="120"><span class="val" id="gridBallCountVal">120</span></label>
      </div>
    </details>
  </div>
  
  <div style="font-size:10px; opacity:0.8; margin-top:12px;">Press <code>R</code> to reset • <code>/</code> toggle panel • <code>1-4</code> switch modes</div>
`;


