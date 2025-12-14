// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      TOP ELEMENTS LAYOUT + HOVER TESTS                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { test, expect } = require('@playwright/test');

const BUILD_URL = 'http://127.0.0.1:8800/index.html';

async function expectHoverOrangeAndDot(page, selector) {
  const el = page.locator(selector).first();
  await expect(el).toBeVisible();
  await el.hover();

  const expected = await page.evaluate(() => {
    // Normalize the intended hover color from CSS var (supports theming changes)
    const root = document.documentElement;
    const raw = getComputedStyle(root).getPropertyValue('--link-hover-color').trim();
    if (!raw) return null;
    const probe = document.createElement('span');
    probe.style.color = raw;
    probe.style.position = 'fixed';
    probe.style.left = '-9999px';
    probe.style.top = '-9999px';
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  });

  const parseRGB = (cssColor) => {
    const m = /rgba?\(([^)]+)\)/.exec(cssColor || '');
    if (!m) return null;
    const [r, g, b] = m[1].split(',').slice(0, 3).map((v) => Number.parseFloat(v.trim()));
    if (![r, g, b].every((n) => Number.isFinite(n))) return null;
    return [r, g, b];
  };

  const expectedRGB = expected ? parseRGB(expected) : [255, 165, 0];

  const isClose = (rgb, target, tol) => {
    if (!rgb || !target) return false;
    return (
      Math.abs(rgb[0] - target[0]) <= tol &&
      Math.abs(rgb[1] - target[1]) <= tol &&
      Math.abs(rgb[2] - target[2]) <= tol
    );
  };

  // Poll to avoid flake under heavy parallel load (transitions can take longer on Firefox/WebKit).
  await expect
    .poll(async () => {
      const color = await el.evaluate((node) => window.getComputedStyle(node).color);
      const rgb = parseRGB(color);
      return isClose(rgb, expectedRGB, expected ? 10 : 8);
    }, { timeout: 1200 })
    .toBe(true);

  await expect
    .poll(async () => {
      const dotOpacity = await el.evaluate((node) => window.getComputedStyle(node, '::after').opacity);
      return Number(dotOpacity);
    }, { timeout: 1200 })
    .toBeGreaterThan(0);
}

test.describe('Top elements layout (legend + text + sound)', () => {
  test('mounts sound toggle in top row (not in social links)', async ({ page }) => {
    await page.goto(BUILD_URL);
    await expect(page.locator('#top-elements')).toHaveCount(1, { timeout: 8000 });

    await expect(page.locator('#sound-toggle')).toHaveCount(1);
    await expect(page.locator('#social-links #sound-toggle')).toHaveCount(0);
  });

  test('keeps 50/50 top layout at desktop and mobile widths', async ({ page }) => {
    await page.goto(BUILD_URL);
    await expect(page.locator('#top-elements')).toHaveCount(1, { timeout: 8000 });

    const assertHalfWidth = async () => {
      const container = page.locator('#top-elements');
      const left = page.locator('#top-elements-left');
      const right = page.locator('#top-elements-right');

      await expect(container).toBeVisible();
      await expect(left).toBeVisible();
      await expect(right).toBeVisible();

      const containerBox = await container.boundingBox();
      const leftBox = await left.boundingBox();
      const rightBox = await right.boundingBox();

      expect(containerBox).toBeTruthy();
      expect(leftBox).toBeTruthy();
      expect(rightBox).toBeTruthy();

      // Top-aligned
      expect(Math.abs(leftBox.y - rightBox.y)).toBeLessThanOrEqual(1);

      // 50/50 split (allow some rounding)
      const leftRatio = leftBox.width / containerBox.width;
      const rightRatio = rightBox.width / containerBox.width;

      // Desktop: true 50/50.
      // Mobile: allow a gutter (we intentionally introduce a vw-based gap).
      const vp = page.viewportSize();
      const isMobile = !!vp && vp.width <= 480;

      if (isMobile) {
        // With a 10vw gutter, each side will be < 50% of the container.
        expect(leftRatio).toBeGreaterThan(0.40);
        expect(leftRatio).toBeLessThan(0.49);
        expect(rightRatio).toBeGreaterThan(0.40);
        expect(rightRatio).toBeLessThan(0.49);
        expect(Math.abs(leftRatio - rightRatio)).toBeLessThan(0.03);
      } else {
        expect(leftRatio).toBeGreaterThan(0.45);
        expect(leftRatio).toBeLessThan(0.55);
        expect(rightRatio).toBeGreaterThan(0.45);
        expect(rightRatio).toBeLessThan(0.55);
      }
    };

    // Desktop-like
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(150);
    await assertHalfWidth();

    // Mobile-like
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    await assertHalfWidth();
  });

  test('hover turns orange and dots appear (links, icons, sound toggle)', async ({ page }) => {
    await page.goto(BUILD_URL);
    await page.waitForTimeout(800);

    await expectHoverOrangeAndDot(page, '#footer-links-container #contact-email');
    await expectHoverOrangeAndDot(page, '.decorative-script a');
    await expectHoverOrangeAndDot(page, '#social-links .footer_icon-link');
    await expectHoverOrangeAndDot(page, '#sound-toggle');
  });
});

