import { useEffect, useState } from 'react';
import { Moon, Sun, Volume2, VolumeX } from 'lucide-react';

import { useRenderedThemeIsDark } from '../../hooks/useRenderedTheme.js';
import {
  SOUND_STATE_EVENT,
  getSoundState,
  initSoundEngine,
  playInteractionSound,
  playSoundEnabledMotif,
  toggleSound,
  unlockAudio,
} from '../../legacy/modules/audio/sound-engine.js';
import { setTheme } from '../../legacy/modules/visual/dark-mode-v2.js';

function readSoundButtonState() {
  try {
    const soundState = getSoundState();
    return {
      isUnlocked: Boolean(soundState?.isUnlocked),
      isEnabled: Boolean(soundState?.isUnlocked && soundState?.isEnabled),
    };
  } catch {
    return {
      isUnlocked: false,
      isEnabled: false,
    };
  }
}

function isPrimaryPointerPress(event) {
  return event.pointerType === 'touch' || event.pointerType === 'pen' || event.button === 0;
}

function beginCapturedPointerPress(event) {
  if (!isPrimaryPointerPress(event)) return false;
  event.currentTarget.dataset.utilityPointerPress = 'true';
  event.currentTarget.setPointerCapture?.(event.pointerId);
  return true;
}

function completeCapturedPointerPress(event) {
  if (!isPrimaryPointerPress(event)) return false;
  const didBeginOnControl = event.currentTarget.dataset.utilityPointerPress === 'true';
  delete event.currentTarget.dataset.utilityPointerPress;
  event.currentTarget.releasePointerCapture?.(event.pointerId);
  return didBeginOnControl;
}

function markPointerActivated(event) {
  event.currentTarget.dataset.utilityPointerActivated = 'true';
}

function consumePointerActivated(event) {
  if (event.currentTarget.dataset.utilityPointerActivated !== 'true') return false;
  delete event.currentTarget.dataset.utilityPointerActivated;
  return true;
}

function isKeyboardPress(event) {
  return !event.repeat && (event.key === 'Enter' || event.key === ' ');
}

function ThemeIcon({ isDark, inButtonBar }) {
  const Icon = isDark ? Moon : Sun;
  return (
    <Icon
      className={inButtonBar ? 'button-bar__secondary-svg' : 'shell-utility-control__glyph'}
      aria-hidden="true"
    />
  );
}

function getButtonClassName(kind, inButtonBar) {
  return [
    'shell-utility-control',
    `shell-utility-control--${kind}`,
    kind === 'theme' ? 'button-bar__theme-toggle' : 'button-bar__sound-toggle',
    inButtonBar ? 'button-bar__secondary-button shell-tab shell-tab--icon-only' : '',
  ].filter(Boolean).join(' ');
}

function ThemeToggle({ decoration, previewTheme, onPreviewThemeChange, inButtonBar }) {
  const renderedThemeIsDark = useRenderedThemeIsDark();
  const isDark = previewTheme ? previewTheme === 'dark' : renderedThemeIsDark;
  const nextTheme = isDark ? 'light' : 'dark';

  const activateTheme = () => {
    if (onPreviewThemeChange) {
      onPreviewThemeChange(nextTheme);
      return;
    }
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      className={getButtonClassName('theme', inButtonBar)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark ? 'true' : 'false'}
      data-state={isDark ? 'dark' : 'light'}
      data-sound-action="manual"
      data-sound-source="theme-toggle"
      onPointerDown={(event) => {
        if (beginCapturedPointerPress(event)) {
          playInteractionSound('press', { source: 'theme-toggle' });
        }
      }}
      onPointerUp={(event) => {
        if (!completeCapturedPointerPress(event)) return;
        markPointerActivated(event);
        activateTheme();
      }}
      onKeyDown={(event) => {
        if (isKeyboardPress(event)) playInteractionSound('press', { source: 'theme-toggle' });
      }}
      onClick={(event) => {
        if (consumePointerActivated(event)) return;
        activateTheme();
      }}
    >
      {decoration}
      <span
        className={inButtonBar ? 'button-bar__theme-thumb' : 'shell-utility-control__icon'}
        aria-hidden="true"
      >
        <ThemeIcon isDark={isDark} inButtonBar={inButtonBar} />
      </span>
    </button>
  );
}

function SoundToggle({ decoration, inButtonBar }) {
  const [soundState, setSoundState] = useState(readSoundButtonState);
  const isEnabled = soundState.isUnlocked && soundState.isEnabled;
  const SoundIcon = isEnabled ? Volume2 : VolumeX;

  useEffect(() => {
    initSoundEngine();

    const syncSoundState = (event) => {
      if (event?.detail) {
        setSoundState({
          isUnlocked: Boolean(event.detail.isUnlocked),
          isEnabled: Boolean(event.detail.isUnlocked && event.detail.isEnabled),
        });
        return;
      }
      setSoundState(readSoundButtonState());
    };

    syncSoundState();
    window.addEventListener(SOUND_STATE_EVENT, syncSoundState);
    return () => {
      window.removeEventListener(SOUND_STATE_EVENT, syncSoundState);
    };
  }, []);

  const handleClick = async () => {
    const currentState = readSoundButtonState();

    if (!currentState.isUnlocked) {
      const didUnlock = await unlockAudio();
      setSoundState(readSoundButtonState());
      if (didUnlock && readSoundButtonState().isEnabled) {
        playInteractionSound('press', { source: 'sound-toggle-enable' });
        playSoundEnabledMotif();
      }
      return;
    }

    if (currentState.isEnabled) {
      playInteractionSound('press', { source: 'sound-toggle-disable' });
    }
    const isNowEnabled = toggleSound();
    setSoundState(readSoundButtonState());
    if (isNowEnabled) {
      playInteractionSound('press', { source: 'sound-toggle-enable' });
      playSoundEnabledMotif();
    }
  };

  return (
    <button
      type="button"
      className={getButtonClassName('sound', inButtonBar)}
      aria-label={isEnabled ? 'Sound on' : 'Sound off'}
      aria-pressed={isEnabled ? 'true' : 'false'}
      data-state={isEnabled ? 'active' : 'idle'}
      data-enabled={isEnabled ? 'true' : 'false'}
      data-sound-action="manual"
      data-sound-source="sound-toggle"
      onPointerDown={beginCapturedPointerPress}
      onPointerUp={(event) => {
        if (!completeCapturedPointerPress(event)) return;
        markPointerActivated(event);
        void handleClick();
      }}
      onClick={(event) => {
        if (consumePointerActivated(event)) return;
        void handleClick();
      }}
    >
      {decoration}
      <span
        className={inButtonBar ? 'button-bar__secondary-icon shell-tab__icon' : 'shell-utility-control__icon'}
        aria-hidden="true"
      >
        <SoundIcon
          className={inButtonBar ? 'button-bar__secondary-svg' : 'shell-utility-control__glyph'}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}

export function ShellUtilityControls({
  inButtonBar = false,
  previewTheme,
  onPreviewThemeChange,
  renderDecoration,
}) {
  return (
    <div
      className={inButtonBar ? 'button-bar__secondary-buttons' : 'shell-utility-controls'}
      role="group"
      aria-label="Theme and sound controls"
      data-button-group={inButtonBar ? 'secondary-buttons' : undefined}
    >
      <ThemeToggle
        decoration={renderDecoration?.({ controlId: 'theme' })}
        previewTheme={previewTheme}
        onPreviewThemeChange={onPreviewThemeChange}
        inButtonBar={inButtonBar}
      />
      <SoundToggle
        decoration={renderDecoration?.({ controlId: 'sound' })}
        inButtonBar={inButtonBar}
      />
    </div>
  );
}
