import homeContent from 'virtual:abs-content/home';
import { getGateCodeLength, getGateInviteCode, markGateAccess } from '../../lib/access-gates.js';
import { triggerHaptic } from '../../lib/haptics.js';
import { trySpaNavigate } from '../../lib/spa-navigation.js';

function mountPortfolioGateSceneBridge() {
  document.querySelector('[data-portfolio-gate-scene-bridge]')?.remove();
  const scene = document.querySelector('[data-portfolio-gate-scene]');
  const simulation = document.getElementById('simulations');
  if (!scene || !simulation) return;

  const bridge = scene.cloneNode(true);
  bridge.removeAttribute('data-portfolio-gate-scene');
  bridge.setAttribute('data-portfolio-gate-scene-bridge', '');
  bridge.classList.add('portfolio-gate-scene--transition-bridge');
  simulation.appendChild(bridge);
}

export function PortfolioGateRoute() {
  const gateCopy = homeContent.gates?.portfolio || {};
  const title = gateCopy.title || 'View Portfolio';
  const description = gateCopy.description
    || 'Good work deserves good context. Many of my projects across finance, automotive, and digital innovation startups are NDA-protected, so access is code-gated.';
  const codeLength = getGateCodeLength('portfolio') || 6;

  const focusInput = (inputs, index) => {
    const input = inputs[index];
    if (input) {
      input.focus();
      input.select();
    }
  };

  const checkCode = (container) => {
    if (container.dataset.gateAccepted === 'true') return;
    const inputs = Array.from(container.querySelectorAll('.portfolio-digit'));
    const enteredCode = inputs.map((input) => input.value).join('');
    if (enteredCode.length !== codeLength) return;

    if (enteredCode === getGateInviteCode('portfolio')) {
      container.dataset.gateAccepted = 'true';
      container.setAttribute('aria-busy', 'true');
      inputs.forEach((input) => {
        input.disabled = true;
      });
      container.classList.remove('pulse-energy');
      void container.offsetWidth;
      container.classList.add('pulse-energy');
      triggerHaptic('success');
      mountPortfolioGateSceneBridge();
      markGateAccess('portfolio');
      window.setTimeout(() => {
        trySpaNavigate('/portfolio.html', {
          replace: true,
          transitionStyle: 'gate-success',
          exitMs: 240,
          enterMs: 300,
        });
      }, 180);
      return;
    }

    triggerHaptic('error');
    window.setTimeout(() => {
      inputs.forEach((input) => {
        input.value = '';
      });
      focusInput(inputs, 0);
    }, 150);
  };

  const handleInput = (event) => {
    const input = event.currentTarget;
    const container = input.closest('.portfolio-gate-inputs');
    if (!container) return;
    const inputs = Array.from(container.querySelectorAll('.portfolio-digit'));
    const index = Number(input.dataset.index || 0);
    const value = input.value.replace(/\D/g, '');
    input.value = value.slice(0, 1);

    if (value.length > 1) {
      value.split('').forEach((char, offset) => {
        const target = inputs[index + offset];
        if (target) target.value = char;
      });
      const nextIndex = Math.min(index + value.length, inputs.length - 1);
      focusInput(inputs, nextIndex);
      checkCode(container);
      return;
    }

    if (input.value && index < inputs.length - 1) {
      triggerHaptic('tap');
      focusInput(inputs, index + 1);
    }
    checkCode(container);
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Backspace' || event.currentTarget.value !== '') return;
    const container = event.currentTarget.closest('.portfolio-gate-inputs');
    const inputs = Array.from(container?.querySelectorAll('.portfolio-digit') || []);
    const index = Number(event.currentTarget.dataset.index || 0);
    if (index > 0) focusInput(inputs, index - 1);
  };

  return (
    <div className="portfolio-gate-route route-centered-page" data-route-content="portfolio-gate">
      <section className="route-centered-page__inner portfolio-gate-route__inner" aria-labelledby="portfolio-gate-title">
        <p className="route-kicker" data-route-enter="identity" data-route-enter-order="0">Private work</p>
        <h1 id="portfolio-gate-title" className="route-centered-page__title" data-route-enter="identity" data-route-enter-order="1">{title}</h1>
        <p id="portfolio-gate-description" className="route-centered-page__description" data-route-enter="context">{description}</p>
        <div
          id="portfolio-route-gate-inputs"
          className="portfolio-gate-inputs portfolio-gate-route__inputs"
          role="group"
          aria-labelledby="portfolio-gate-title"
          aria-describedby="portfolio-gate-description"
          data-route-enter="action"
        >
          {Array.from({ length: codeLength }, (_, index) => (
            <input
              key={`portfolio-route-digit-${index}`}
              type="text"
              maxLength="1"
              className="portfolio-digit"
              inputMode="numeric"
              pattern="[0-9]"
              data-index={index}
              aria-label={`Portfolio invite code digit ${index + 1} of ${codeLength}`}
              autoComplete="off"
              onInput={handleInput}
              onKeyDown={handleKeyDown}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
