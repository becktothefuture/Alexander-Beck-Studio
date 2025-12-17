# After Optimizations (Mobile Lighthouse)

Run date: 2025-12-17

## Command

```bash
npx lighthouse http://localhost:8000 \
  --only-categories=performance \
  --form-factor=mobile \
  --throttling-method=simulate \
  --output=json \
  --output-path=perf/after/lighthouse-mobile.json \
  --save-assets \
  --chrome-flags="--headless=new --no-sandbox"
```

## Key results

- Performance score: **0.61**
- FCP: **5.9s**
- LCP: **7.7s**
- Speed Index: **5.9s**
- TBT: **30ms**
- CLS: **0.018**
- TTI: **6.9s**
- Max Potential FID: **60ms**
- JS execution time: **1.5s**
- Main-thread work: **2.1s**

## Artifacts

- `perf/after/lighthouse-mobile.json`
- `perf/after/lighthouse-mobile-0.trace.json`
- `perf/after/lighthouse-mobile-0.devtoolslog.json`

## Notes

- Lighthouse logged `RootCauses` / `TraceElements` gatherer errors (`frame_sequence` missing) but still produced usable metrics and trace artifacts.


