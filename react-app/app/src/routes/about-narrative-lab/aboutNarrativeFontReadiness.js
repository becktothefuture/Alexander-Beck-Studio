// Inspect measured text, including offscreen beats and their native measure
// copies. Opacity, inertness and entrance transforms do not remove font needs.
export function collectAboutNarrativeFontRequests(content) {
  const document = content.ownerDocument;
  const requests = new Map();
  const styles = new Map();
  const walker = document.createTreeWalker(content, 4); // NodeFilter.SHOW_TEXT
  let textNode = walker.nextNode();
  while (textNode) {
    const element = textNode.parentElement;
    const text = textNode.textContent || '';
    if (element && text.trim()) {
      let style = styles.get(element);
      if (!style) {
        style = document.defaultView.getComputedStyle(element);
        styles.set(element, style);
      }
      const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      let request = requests.get(font);
      if (!request) {
        request = { font, family: style.fontFamily, glyphs: new Set() };
        requests.set(font, request);
      }
      // Include transformed letters without duplicating the visual line tree.
      const glyphs = style.textTransform && style.textTransform !== 'none'
        ? `${text}${text.toLocaleUpperCase()}${text.toLocaleLowerCase()}` : text;
      for (const glyph of glyphs) request.glyphs.add(glyph);
    }
    textNode = walker.nextNode();
  }
  return Array.from(requests.values(), ({ font, family, glyphs }) => ({
    font, family, text: Array.from(glyphs).sort().join(''),
  }));
}

function includesFamily(request, face) {
  const family = String(face.family).replaceAll(/^["']|["']$/g, '').toLowerCase();
  return request.family.split(',').some(part => (
    part.trim().replaceAll(/^["']|["']$/g, '').toLowerCase() === family
  ));
}

function includesRequestedGlyph(face, text) {
  if (!face.unicodeRange) return true;
  return face.unicodeRange.split(',').some((range) => {
    const match = /^U\+([\da-f?]+)(?:-([\da-f]+))?$/i.exec(range.trim());
    // Unknown descriptors must not hide a potentially required pending face.
    if (!match) return true;
    const first = Number.parseInt(match[1].replaceAll('?', '0'), 16);
    const last = Number.parseInt(match[2] || match[1].replaceAll('?', 'f'), 16);
    return Array.from(text).some(glyph => (
      glyph.codePointAt(0) >= first && glyph.codePointAt(0) <= last
    ));
  });
}

// Own only the font requests that can affect About's measured copy. In
// WebKit, a cancelled navigation can leave an unrelated Home font in the
// global loading set even though every required About face is already loaded.
export function createAboutNarrativeFontReadiness(fontSet, onChange) {
  const records = new Map();
  let disposed = false;

  const relevantPending = request => Array.from(fontSet).filter(face => (
    face.status === 'loading' && includesFamily(request, face)
    && includesRequestedGlyph(face, request.text)
  ));
  const canRetainLoaded = (record) => {
    if (typeof fontSet?.has !== 'function' || typeof fontSet[Symbol.iterator] !== 'function'
      || !record.faces.length || !record.faces.every(face => (
        face.status === 'loaded' && fontSet.has(face)
      ))) return false;
    return fontSet.check(record.request.font, record.request.text)
      && relevantPending(record.request).length === 0;
  };
  const refreshRetainedReadiness = (record) => {
    if (!record.retainingLoaded || canRetainLoaded(record)) return false;
    record.retainingLoaded = false;
    record.status = 'loading';
    return true;
  };
  const settle = (key, record, status, diagnostic = null) => {
    if (disposed || records.get(key) !== record) return;
    record.inFlight = false;
    record.retainingLoaded = false;
    record.status = status;
    record.diagnostic = diagnostic;
    onChange();
  };
  const start = (key, request, previous = null) => {
    const retainingLoaded = previous?.status === 'loaded';
    const record = {
      request, status: retainingLoaded ? 'loaded' : 'loading',
      faces: retainingLoaded ? previous.faces : [], diagnostic: null,
      inFlight: true, retainingLoaded, revalidating: Boolean(previous),
    };
    records.set(key, record);
    if (typeof fontSet?.load !== 'function' || typeof fontSet?.check !== 'function') {
      record.inFlight = false;
      record.retainingLoaded = false;
      record.status = 'fallback';
      record.diagnostic = 'font-api-unavailable';
      return record;
    }
    refreshRetainedReadiness(record);
    // load() performs the browser's family/style/weight/unicode matching. A
    // true check() with zero matching faces must not be called a loaded font.
    Promise.resolve().then(() => {
      if (disposed || records.get(key) !== record) return [];
      const loading = fontSet.load(request.font, request.text);
      // Native matching can start a previously unloaded face synchronously.
      // Retention must be checked after that call, not only before it.
      if (refreshRetainedReadiness(record)) onChange();
      return loading;
    }).then(async (faces) => {
      if (disposed || records.get(key) !== record) return;
      record.faces = Array.from(faces);
      if (!record.faces.length) {
        settle(key, record, 'fallback', 'no-matching-webfont');
      } else {
        if (refreshRetainedReadiness(record)) onChange();
        await Promise.all(record.faces.map(face => face.loaded));
        if (disposed || records.get(key) !== record) return;
        if (record.faces.every(face => face.status === 'loaded'
          && (typeof fontSet.has !== 'function' || fontSet.has(face)))
          && fontSet.check(request.font, request.text)
          && (!record.revalidating || relevantPending(request).length === 0)) {
          settle(key, record, 'loaded');
        } else {
          // An unsettled/inconsistent used face must never become a readable
          // fallback success merely because the global font set has settled.
          settle(key, record, 'unconfirmed', 'font-load-incomplete');
        }
      }
    }).catch(async (error) => {
      if (disposed || records.get(key) !== record) return;
      if (record.retainingLoaded) {
        record.retainingLoaded = false;
        record.status = 'loading';
        onChange();
      }
      if (typeof fontSet[Symbol.iterator] !== 'function') {
        settle(key, record, 'unconfirmed', 'font-failure-settlement-unavailable');
        return;
      }
      // load() rejects as soon as any matched face fails. Its rejection does
      // not expose the matched list, so conservatively await pending faces in
      // the requested families/ranges, including alternate styles or weights.
      // Unrelated families and unused Unicode ranges cannot block About.
      const pending = relevantPending(request);
      record.faces = pending;
      await Promise.allSettled(pending.map(face => face.loaded));
      if (disposed || records.get(key) !== record) return;
      if (relevantPending(request).length) {
        settle(key, record, 'unconfirmed', 'font-failed-with-pending-faces');
        return;
      }
      settle(key, record, 'fallback', `font-load-failed: ${error?.message || String(error)}`);
    });
    return record;
  };

  const handleLoading = () => {
    if (disposed) return;
    let changed = false;
    for (const record of records.values()) {
      if (refreshRetainedReadiness(record)) changed = true;
    }
    if (changed) onChange();
  };
  // A completed event can repeat already loaded sibling faces. Revalidate
  // their native matching without announcing a new load when the previously
  // verified request is still loaded. New or pending requests still block.
  const handleLoadingDone = (event) => {
    if (disposed) return;
    let changed = false;
    for (const [key, record] of records) {
      if (refreshRetainedReadiness(record)) changed = true;
      const relevant = Array.from(event.fontfaces || []).some(face => (
        (face.status === 'loaded' || face.status === 'error') && includesFamily(record.request, face)
        && includesRequestedGlyph(face, record.request.text)
        && (record.status !== 'loaded' || !record.faces.includes(face))
      ));
      if (relevant) {
        // Only one native load owns a request. A face that settles while it
        // is in flight still schedules measurement, without replacing it.
        if (!record.inFlight) start(key, record.request, record);
        changed = true;
      }
    }
    if (changed) onChange();
  };
  fontSet?.addEventListener?.('loading', handleLoading);
  fontSet?.addEventListener?.('loadingdone', handleLoadingDone);
  fontSet?.addEventListener?.('loadingerror', handleLoadingDone);

  return {
    read(requests) {
      if (disposed) return { ready: false, status: 'disposed', diagnostics: [] };
      const currentKeys = new Set(requests.map(request => `${request.font}\n${request.text}`));
      for (const key of records.keys()) if (!currentKeys.has(key)) records.delete(key);
      let revoked = false;
      const active = requests.map((request) => {
        const key = `${request.font}\n${request.text}`;
        const record = records.get(key) || start(key, request);
        if (refreshRetainedReadiness(record)) revoked = true;
        return record;
      });
      if (revoked) onChange();
      const pending = !active.length || active.some(record => (
        record.status === 'loading' || record.status === 'unconfirmed'
      ));
      const diagnostics = active.filter(record => record.diagnostic).map(record => ({
        font: record.request.font, reason: record.diagnostic,
      }));
      return {
        ready: !pending,
        status: pending ? 'loading' : diagnostics.length ? 'fallback' : 'loaded',
        diagnostics,
      };
    },
    destroy() {
      disposed = true;
      records.clear();
      fontSet?.removeEventListener?.('loading', handleLoading);
      fontSet?.removeEventListener?.('loadingdone', handleLoadingDone);
      fontSet?.removeEventListener?.('loadingerror', handleLoadingDone);
    },
  };
}
