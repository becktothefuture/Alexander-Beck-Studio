const CODE_DEMO_IDS = new Set([
  'pulse-grid',
  'orbit-bands',
  'wave-field',
  'kinetic-type',
  'pebble-sort',
  'colour-clock',
]);

function buildCodeDemoDocument(demoId) {
  const encodedDemoId = JSON.stringify(demoId);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <style>
    html,body,canvas{width:100%;height:100%;margin:0;display:block;overflow:hidden}
    body{background:#101010}
  </style>
</head>
<body>
  <canvas aria-label="Local animated code study"></canvas>
  <script>
    (() => {
      'use strict';
      const demoId = ${encodedDemoId};
      const canvas = document.querySelector('canvas');
      const context = canvas.getContext('2d');
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
      const colors = ['#568FCA', '#7254B7', '#FF6846', '#F2C943', '#3A857C', '#D2485B'];
      let width = 1;
      let height = 1;
      let frame = 0;

      addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        parent.postMessage({
          type: 'abs:playground-code-escape',
          demoId,
        }, '*');
      });

      function resize() {
        const ratio = Math.min(2, devicePixelRatio || 1);
        width = Math.max(1, innerWidth);
        height = Math.max(1, innerHeight);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
      }

      function background(color) {
        context.fillStyle = color;
        context.fillRect(0, 0, width, height);
      }

      function circle(x, y, radius, color) {
        context.beginPath();
        context.arc(x, y, Math.max(1, radius), 0, Math.PI * 2);
        context.fillStyle = color;
        context.fill();
      }

      function renderPulseGrid(time) {
        background('#101010');
        const columns = 4;
        const rows = 3;
        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            const phase = time * 0.002 + row * 0.9 + column * 0.7;
            const radius = Math.min(width, height) * (0.045 + (Math.sin(phase) + 1) * 0.025);
            circle(
              width * (column + 1) / (columns + 1),
              height * (row + 1) / (rows + 1),
              radius,
              colors[(row * columns + column) % colors.length]
            );
          }
        }
      }

      function renderOrbitBands(time) {
        background('#EDE9E0');
        context.lineWidth = Math.max(28, Math.min(width, height) * 0.12);
        context.strokeStyle = '#7254B7';
        context.beginPath();
        context.ellipse(width / 2, height / 2, width * 0.34, height * 0.24, 0, 0, Math.PI * 2);
        context.stroke();
        const angle = time * 0.0007;
        circle(
          width / 2 + Math.cos(angle) * width * 0.34,
          height / 2 + Math.sin(angle) * height * 0.24,
          Math.min(width, height) * 0.075,
          '#FF6846'
        );
      }

      function renderWaveField(time) {
        background('#568FCA');
        context.beginPath();
        context.moveTo(0, height);
        for (let x = 0; x <= width + 12; x += 12) {
          const y = height * 0.56 + Math.sin(x * 0.014 + time * 0.0015) * height * 0.16;
          context.lineTo(x, y);
        }
        context.lineTo(width, height);
        context.fillStyle = '#101010';
        context.fill();
        circle(width * 0.5, height * 0.28, Math.min(width, height) * 0.11, '#F2C943');
      }

      function renderKineticType(time) {
        background('#F2C943');
        context.save();
        context.translate(width / 2, height / 2);
        context.rotate(Math.sin(time * 0.0012) * 0.08);
        context.fillStyle = '#101010';
        context.font = '900 ' + Math.round(Math.min(width * 0.31, height * 0.52)) + 'px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('PLAY', 0, 0);
        context.restore();
      }

      function renderPebbleSort(time) {
        background('#D2485B');
        const progress = (Math.sin(time * 0.0011) + 1) / 2;
        for (let index = 0; index < 4; index += 1) {
          const rank = index % 2 === 0 ? index + progress : index - progress;
          const x = width * (0.18 + rank * 0.21);
          const pebbleHeight = height * (0.28 + index * 0.1);
          context.beginPath();
          context.ellipse(x, height / 2, width * 0.07, pebbleHeight / 2, 0, 0, Math.PI * 2);
          context.fillStyle = colors[index];
          context.fill();
        }
      }

      function renderColourClock(time) {
        background('#EDE9E0');
        const radius = Math.min(width, height) * 0.31;
        for (let index = 0; index < 6; index += 1) {
          const start = time * 0.0005 + index * Math.PI / 3;
          context.beginPath();
          context.moveTo(width / 2, height / 2);
          context.arc(width / 2, height / 2, radius, start, start + Math.PI / 3);
          context.closePath();
          context.fillStyle = colors[index];
          context.fill();
        }
        circle(width / 2, height / 2, radius * 0.24, '#101010');
      }

      const renderers = {
        'pulse-grid': renderPulseGrid,
        'orbit-bands': renderOrbitBands,
        'wave-field': renderWaveField,
        'kinetic-type': renderKineticType,
        'pebble-sort': renderPebbleSort,
        'colour-clock': renderColourClock,
      };

      function paint(time) {
        (renderers[demoId] || renderPulseGrid)(reducedMotion.matches ? 0 : time);
      }

      function tick(time) {
        paint(time);
        frame = requestAnimationFrame(tick);
      }

      function start() {
        cancelAnimationFrame(frame);
        if (document.hidden || reducedMotion.matches) {
          paint(0);
        } else {
          frame = requestAnimationFrame(tick);
        }
      }

      resize();
      start();
      addEventListener('resize', () => { resize(); paint(0); }, { passive: true });
      document.addEventListener('visibilitychange', start);
      reducedMotion.addEventListener('change', start);
    })();
  </script>
</body>
</html>`;
}

export function hasPlaygroundCodeDemo(demoId) {
  return CODE_DEMO_IDS.has(demoId);
}

export function getPlaygroundCodeDemoSrcDoc(demoId) {
  return hasPlaygroundCodeDemo(demoId) ? buildCodeDemoDocument(demoId) : null;
}
