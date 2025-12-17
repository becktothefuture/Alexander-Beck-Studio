# Baseline Performance (Mobile Lighthouse)

Run date: 2025-12-17

## Command

```bash
npx lighthouse http://localhost:8000 \
  --only-categories=performance \
  --form-factor=mobile \
  --throttling-method=simulate \
  --output=json \
  --output-path=perf/baseline/lighthouse-mobile.json \
  --save-assets \
  --chrome-flags="--headless=new --no-sandbox"
```

## Key results

- Performance score: **0.50**
- FCP: **8.3s**
- LCP: **14.1s**
- Speed Index: **10.5s**
- TBT: **270ms**
- CLS: **0.018**
- TTI: **11.4s**
- Max Potential FID: **300ms**
- JS execution time: **0.9s**
- Main-thread work: **1.7s**

## Artifacts

- `perf/baseline/lighthouse-mobile.json`
- `perf/baseline/lighthouse-mobile-0.trace.json`
- `perf/baseline/lighthouse-mobile-0.devtoolslog.json`

## Notes

- Lighthouse logged `RootCauses` / `TraceElements` gatherer errors (`frame_sequence` missing) but still produced usable metrics and trace artifacts.


