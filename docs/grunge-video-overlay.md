# Grunge Video Overlay - Documentation

## Overview

A performant full-screen video overlay system that creates an oldschool found-footage aesthetic using water drops on glass or similar grunge textures. The video uses blend modes to create a transparent, atmospheric effect across the entire website.

## Features

- **Performant**: Hardware-accelerated rendering with optimized video playback
- **Soft fade-in**: Elegant 2-second fade-in when video is loaded
- **Theme-aware**: Different blend modes for light/dark themes
- **Responsive**: Full viewport coverage across all screen sizes
- **Accessible**: Respects `prefers-reduced-motion` preference
- **Non-intrusive**: Pointer events disabled, doesn't block user interactions
- **Looping**: Seamless continuous playback

## Free Video Sources

Here are 3 excellent free video repositories where you can find "water drops on glass" footage:

### 1. **Pexels Videos** (Recommended)
- **URL**: https://www.pexels.com/videos/
- **License**: Free for commercial use, no attribution required
- **Search terms**: "rain glass", "water drops window", "raindrops glass"
- **Quality**: High resolution (1080p, 4K available)
- **Formats**: MP4, multiple resolutions
- **Notes**: Excellent selection, easy download, reliable hosting

### 2. **Pixabay Videos**
- **URL**: https://pixabay.com/videos/
- **License**: Pixabay License (free for commercial use)
- **Search terms**: "rain window", "raindrops glass", "water glass texture"
- **Quality**: Various resolutions (720p-4K)
- **Formats**: MP4, WebM available
- **Notes**: Good variety, some vintage/grunge filters already applied

### 3. **Videvo** (Free Section)
- **URL**: https://www.videvo.net/
- **License**: Videvo Standard License (free with attribution) or Premium (no attribution)
- **Search terms**: "rain glass", "water drops texture", "wet glass"
- **Quality**: HD to 4K
- **Formats**: MP4, MOV, WebM
- **Notes**: Professional quality, some videos already have grunge/vintage look

## Installation & Setup

### Step 1: Download Your Video

1. Visit one of the video sources above
2. Search for "rain glass" or "water drops window"
3. Download in MP4 format (WebM as optional secondary format)
4. **Recommended specs**:
   - Resolution: 1920×1080 (1080p) or higher
   - Framerate: 24-30 fps (lower is more cinematic)
   - File size: Keep under 5MB for performance (use compression if needed)
   - Duration: 10-30 seconds (will loop seamlessly)

### Step 2: Optimize Your Video (Optional but Recommended)

For best performance, compress your video using a tool like:

- **HandBrake** (Free, cross-platform): https://handbrake.fr/
- **FFmpeg** (Command line):
  ```bash
  # Compress to web-optimized MP4
  ffmpeg -i input.mp4 -vcodec h264 -crf 28 -preset slow -c:a copy output.mp4
  
  # Create WebM version (modern browsers)
  ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 output.webm
  ```

**Target file size**: 2-5MB for a 10-20 second loop

### Step 3: Add Video to Your Project

1. Create a `videos` folder in your project:
   ```
   source/videos/
   ```

2. Place your video files there:
   ```
   source/videos/grunge-overlay.mp4
   source/videos/grunge-overlay.webm (optional)
   ```

3. Update the video source in **all three HTML files**:
   - `source/index.html`
   - `source/portfolio.html`
   - `source/cv.html`

   Find the video element and uncomment/update the source lines:

   ```html
   <video 
     id="grunge-video-overlay" 
     class="grunge-video-overlay"
     autoplay 
     muted 
     loop 
     playsinline
     preload="auto"
     aria-hidden="true"
   >
     <!-- Update these paths to your video files -->
     <source src="videos/grunge-overlay.webm" type="video/webm">
     <source src="videos/grunge-overlay.mp4" type="video/mp4">
   </video>
   ```

   **Note**: WebM is listed first because it's typically smaller and more efficient for web use.

### Step 4: Build & Test

1. Run the development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:8001 in your browser

3. The video should fade in softly after 2 seconds

4. Test on multiple pages (index, portfolio, CV)

5. Test in both light and dark modes to verify blend modes work correctly

## Customization

### Control Panel

Video overlay settings are available in the dev control panel under **"Video Overlay"** (📼 icon):
- **Enabled** - Toggle video overlay on/off
- **Opacity** - Video transparency (0-1)
- **Blend (Light)** - Blend mode for light mode video
- **Blend (Dark)** - Blend mode for dark mode video

### CSS Custom Properties

Settings are also controllable via CSS in `source/css/tokens.css`:

```css
/* Grunge Video Overlay Configuration */
--grunge-video-opacity: 0.8;                        /* Final opacity (0-1) */
--grunge-video-blend-mode-light: overlay;           /* Light mode blend */
--grunge-video-blend-mode-dark: screen;             /* Dark mode blend */
--grunge-video-fade-duration: 2000ms;               /* Fade-in duration */
--grunge-video-fade-easing: cubic-bezier(0.16, 1, 0.3, 1); /* Easing curve */
```

### Video Files

The system uses separate videos for light and dark modes:
- `source/video/video-light.webm` - Light mode video
- `source/video/video-dark.mp4` - Dark mode video
- `source/video/archive/` - Unused videos (gitignored)

### Blend Mode Guide

The blend mode determines how the video mixes with the content below:

#### **overlay** (Default for light mode)
- **Effect**: Combines multiply and screen, creates contrast
- **Best for**: Varied lighting, creates dramatic effect
- **Use when**: Video has mixed tones

#### **screen** (Default for dark mode)
- **Effect**: Lightens the image (white = transparent)
- **Best for**: Dark videos over light content
- **Use when**: Video has dark/black background

#### **multiply**
- **Effect**: Darkens the image (white = transparent)
- **Best for**: Light-colored videos over dark content
- **Use when**: Video has white/light background

#### **soft-light**
- **Effect**: Subtle, gentle contrast
- **Best for**: Very subtle grunge effect
- **Use when**: You want minimal visual impact

#### **hard-light**
- **Effect**: Strong contrast
- **Best for**: Dramatic, intense grunge look
- **Use when**: You want maximum vintage effect

### Example Customizations

**Subtle grunge (barely visible)**:
```css
--grunge-video-opacity: 0.3;
--grunge-video-blend-mode-light: soft-light;
--grunge-video-blend-mode-dark: soft-light;
```

**Dramatic found footage**:
```css
--grunge-video-opacity: 1;
--grunge-video-blend-mode-light: hard-light;
--grunge-video-blend-mode-dark: overlay;
```

**Fast fade-in**:
```css
--grunge-video-fade-duration: 800ms;
```

**Disable overlay**:
```css
--grunge-video-enabled: 0;
```

## Troubleshooting

### Video doesn't appear

1. **Check the source paths** are correct in all HTML files
2. **Check browser console** for errors (F12 → Console tab)
3. **Verify video format** is supported (MP4/H.264 is most compatible)
4. **Check file size** - very large files may not load on slow connections

### Video appears but doesn't play

1. **Autoplay blocked** - This is normal on some browsers. Video won't show if it can't play.
2. **Check muted attribute** - Required for autoplay to work
3. **Check playsinline attribute** - Required for iOS Safari
4. Try interaction with page first (click anywhere), then refresh

### Video flickers or stutters

1. **Reduce video resolution** - 1080p is usually sufficient
2. **Compress the video** - Aim for 2-5MB file size
3. **Reduce framerate** - 24-30fps is ideal for this effect
4. **Check GPU acceleration** - Ensure browser has hardware acceleration enabled

### Blend mode looks wrong

1. **Try different blend modes** - Different videos work better with different modes
2. **Adjust opacity** - Lower opacity can help blend more naturally
3. **Check video brightness** - Very dark/light videos may need specific blend modes
4. **Test in both themes** - Light and dark modes may need different blend modes

### Performance issues

1. **Compress video** - File size is the #1 performance factor
2. **Lower resolution** - 720p may be sufficient for background effect
3. **Reduce duration** - Shorter loops are more efficient
4. **Disable on mobile** (optional):
   ```css
   @media (max-width: 768px) {
     .grunge-video-overlay {
       display: none;
     }
   }
   ```

## Technical Details

### Architecture

- **Videos are direct children of `<body>`** - Required for `mix-blend-mode` to work across page content
- **`isolation: isolate` on body** - Creates unified stacking context for blend modes
- **No z-index on videos** - Prevents isolated stacking context that breaks blend modes
- **Separate light/dark videos** - Different files and blend modes per theme
- **Positioning**: Fixed, matches simulation interior bounds (wall inset + thickness)
- **Accessibility**: `aria-hidden="true"`, respects `prefers-reduced-motion`
- **Interaction**: `pointer-events: none` (doesn't block clicks)
- **Border radius**: Matches simulation interior via `var(--wall-radius)`

### Blend Mode Requirements

For `mix-blend-mode` to work across all page content:
1. Body must have `isolation: isolate` (creates unified backdrop)
2. Video must NOT have `z-index` (prevents isolated stacking context)
3. Video must be outside containers with `z-index` (like `.overlay-effects`)

### Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (requires `playsinline` attribute)
- **Mobile Safari**: Full support with `playsinline` and `muted`
- **Older browsers**: Gracefully degrades (video won't show if unsupported)

### File Structure

```
source/
├── index.html              # Videos as direct body children
├── video/
│   ├── video-light.webm    # Light mode video
│   ├── video-dark.mp4      # Dark mode video
│   └── archive/            # Unused videos (gitignored)
├── css/
│   ├── tokens.css          # CSS variables (--grunge-video-*)
│   └── main.css            # Video overlay styles
└── modules/
    └── ui/
        └── control-registry.js  # Panel controls for video overlay
```

### HTML Structure (index.html)

Videos are placed as direct children of `<body>` after the overlay effects container:

```html
<!-- OVERLAY EFFECTS: Noise layer -->
<div id="overlay-effects" class="overlay-effects" aria-hidden="true">
  <div class="noise"></div>
</div>

<!-- GRUNGE VIDEO OVERLAYS: Direct body children for proper blend mode compositing -->
<!-- Light mode video (overlay blend) -->
<video id="grunge-video-light" class="grunge-video-overlay grunge-video-overlay--light" ...>
  <source src="video/video-light.webm" type="video/webm">
</video>
<!-- Dark mode video (screen blend) -->
<video id="grunge-video-dark" class="grunge-video-overlay grunge-video-overlay--dark" ...>
  <source src="video/video-dark.mp4" type="video/mp4">
</video>
```

## Examples

### Example 1: Raindrop Overlay
- **Video**: Raindrops on window glass
- **Blend mode**: `multiply` (light), `overlay` (dark)
- **Opacity**: `0.8`
- **Effect**: Subtle atmospheric wetness

### Example 2: Film Grain
- **Video**: Static/grain texture loop
- **Blend mode**: `overlay` (both modes)
- **Opacity**: `0.4`
- **Effect**: Vintage film aesthetic

### Example 3: Dust & Scratches
- **Video**: Old film damage texture
- **Blend mode**: `screen` (light), `hard-light` (dark)
- **Opacity**: `0.6`
- **Effect**: Found footage, archival look

## Credits

Video overlay system designed for Alexander Beck Studio.
Built with performance, accessibility, and aesthetic quality in mind.

## License

This feature is part of the Alexander Beck Studio website codebase.
Video content should be sourced from properly licensed repositories.
