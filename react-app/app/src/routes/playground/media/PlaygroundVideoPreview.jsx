import { useCallback, useEffect, useRef, useState } from 'react';
import { getPlaygroundMediaStyle, getPlaygroundVideoMimeType } from './mediaPresentation.js';
import { PlaygroundMediaFallback } from './PlaygroundMediaFallback.jsx';
import { PlaygroundPoster } from './PlaygroundPoster.jsx';

export function PlaygroundVideoPreview({
  item,
  active = false,
  visible = true,
  motionAllowed = true,
  controls = false,
  decorative = true,
  posterOnly = false,
  className = '',
  runtimeOwnerId,
  onRuntimeStateChange,
}) {
  const videoRef = useRef(null);
  const resumeAfterVisibilityRef = useRef(false);
  const videoFrameCallbackRef = useRef(0);
  const animationFrameCallbackRef = useRef(0);
  const readyPublishedRef = useRef(false);
  const runtimeActiveRef = useRef(false);
  const [state, setState] = useState('loading');
  const shouldMountVideo = !posterOnly && active && visible && (motionAllowed || controls);
  const classes = ['playground-media', 'playground-media--video', className].filter(Boolean).join(' ');

  const cancelReadinessCallback = useCallback(() => {
    const video = videoRef.current;
    if (videoFrameCallbackRef.current && typeof video?.cancelVideoFrameCallback === 'function') {
      video.cancelVideoFrameCallback(videoFrameCallbackRef.current);
    }
    if (animationFrameCallbackRef.current) {
      window.cancelAnimationFrame(animationFrameCallbackRef.current);
    }
    videoFrameCallbackRef.current = 0;
    animationFrameCallbackRef.current = 0;
  }, []);

  const publishPlaybackReady = useCallback(() => {
    if (!runtimeActiveRef.current || readyPublishedRef.current) return;
    readyPublishedRef.current = true;
    setState('ready');
    if (runtimeOwnerId && typeof onRuntimeStateChange === 'function') {
      onRuntimeStateChange({
        type: 'video',
        ownerId: runtimeOwnerId,
        active: true,
        ready: true,
      });
    }
  }, [onRuntimeStateChange, runtimeOwnerId]);

  const handlePlaying = useCallback(() => {
    const video = videoRef.current;
    if (!video || readyPublishedRef.current) return;
    cancelReadinessCallback();
    if (typeof video.requestVideoFrameCallback === 'function') {
      videoFrameCallbackRef.current = video.requestVideoFrameCallback(() => {
        videoFrameCallbackRef.current = 0;
        publishPlaybackReady();
      });
      return;
    }
    animationFrameCallbackRef.current = window.requestAnimationFrame(() => {
      animationFrameCallbackRef.current = window.requestAnimationFrame(() => {
        animationFrameCallbackRef.current = 0;
        publishPlaybackReady();
      });
    });
  }, [cancelReadinessCallback, publishPlaybackReady]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldMountVideo) return undefined;

    const playVideo = () => {
      const playPromise = video.play();
      playPromise?.catch(() => video.pause());
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        resumeAfterVisibilityRef.current = !video.paused && !video.ended;
        video.pause();
        return;
      }

      if (!motionAllowed) {
        resumeAfterVisibilityRef.current = false;
        video.pause();
        return;
      }

      if (!controls || resumeAfterVisibilityRef.current) playVideo();
      resumeAfterVisibilityRef.current = false;
    };

    if (document.hidden || !motionAllowed) {
      video.pause();
    } else {
      playVideo();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resumeAfterVisibilityRef.current = false;
      video.pause();
    };
  }, [controls, motionAllowed, shouldMountVideo]);

  useEffect(() => {
    if (!runtimeOwnerId || typeof onRuntimeStateChange !== 'function') return undefined;
    if (!shouldMountVideo) return undefined;
    runtimeActiveRef.current = true;
    readyPublishedRef.current = false;
    onRuntimeStateChange({
      type: 'video',
      ownerId: runtimeOwnerId,
      active: true,
      ready: false,
    });
    return () => {
      runtimeActiveRef.current = false;
      cancelReadinessCallback();
      readyPublishedRef.current = false;
      onRuntimeStateChange({
        type: 'video',
        ownerId: runtimeOwnerId,
        active: false,
        ready: false,
      });
    };
  }, [cancelReadinessCallback, item?.source, onRuntimeStateChange, runtimeOwnerId, shouldMountVideo]);

  if (!shouldMountVideo) {
    return (
      <PlaygroundPoster
        item={item}
        decorative={decorative}
        className={className}
        renderMode="poster"
      />
    );
  }

  return (
    <div
      className={classes}
      data-media-type="video"
      data-render-mode="active"
      data-media-state={state}
      style={getPlaygroundMediaStyle(item)}
    >
      {state === 'fallback' ? (
        <PlaygroundMediaFallback item={item} decorative={decorative} message="Video unavailable" />
      ) : (
        <video
          ref={videoRef}
          className="playground-media__asset"
          aria-label={decorative ? undefined : item?.accessibilityText}
          aria-hidden={decorative ? 'true' : undefined}
          poster={item?.poster}
          controls={controls}
          tabIndex={controls ? 0 : -1}
          autoPlay={motionAllowed}
          loop
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onCanPlay={() => setState((current) => (current === 'loading' ? 'buffered' : current))}
          onPlaying={handlePlaying}
          onError={() => {
            runtimeActiveRef.current = false;
            cancelReadinessCallback();
            readyPublishedRef.current = false;
            setState('fallback');
            if (runtimeOwnerId && typeof onRuntimeStateChange === 'function') {
              onRuntimeStateChange({
                type: 'video',
                ownerId: runtimeOwnerId,
                active: false,
                ready: false,
              });
            }
          }}
        >
          <source src={item?.source} type={getPlaygroundVideoMimeType(item?.source)} />
        </video>
      )}
    </div>
  );
}
