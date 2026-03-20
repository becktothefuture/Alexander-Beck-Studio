/* ╔══════════════════════════════════════════════════════════════════════════════╗
   ║  STYLEGUIDE — Typography reference (tokens + semantic specimens)            ║
   ╚══════════════════════════════════════════════════════════════════════════════╝ */

export function StyleguideTypographySection() {
  return (
    <section className="styleguide-section" aria-labelledby="sg-type">
      <h2 id="sg-type">Typography</h2>
      <p className="styleguide-section__hint">
        Source tokens: <code className="styleguide-doc__code">tokens.css</code> (
        <code className="styleguide-doc__code">--abs-font-*</code>, <code className="styleguide-doc__code">--text-*</code>,{' '}
        <code className="styleguide-doc__code">--line-height-*</code>, <code className="styleguide-doc__code">--letter-spacing-*</code>
        ). Fonts load via Google Fonts on each HTML shell (
        <code className="styleguide-doc__code">DM Sans</code>, <code className="styleguide-doc__code">DM Mono</code>
        ); display script uses system cursive stack (<code className="styleguide-doc__code">--abs-font-display</code>).
      </p>

      <h3 className="styleguide-type-subhd" id="sg-type-families">
        Font families
      </h3>
      <div className="styleguide-type-cards">
        <div className="styleguide-type-card styleguide-type-card--sans" role="group" aria-label="Sans UI">
          <div className="styleguide-type-card__meta">--abs-font-sans</div>
          <p className="styleguide-type-card__sample" lang="en">
            DM Sans — UI sans · 0123456789
          </p>
        </div>
        <div className="styleguide-type-card styleguide-type-card--mono" role="group" aria-label="Monospace">
          <div className="styleguide-type-card__meta">--abs-font-mono</div>
          <p className="styleguide-type-card__sample" lang="en">
            DM Mono — edge caption / mono · 01:23:45
          </p>
        </div>
        <div className="styleguide-type-card styleguide-type-card--display" role="group" aria-label="Display script">
          <div className="styleguide-type-card__meta">--abs-font-display</div>
          <p className="styleguide-type-card__sample" lang="en">
            London — corner meta (script stack)
          </p>
        </div>
      </div>

      <h3 className="styleguide-type-subhd" id="sg-type-weights">
        Weights
      </h3>
      <ul className="styleguide-type-weights">
        <li>
          <span className="styleguide-type-weights__token">--abs-weight-regular (400)</span>
          <span className="styleguide-type-weights__sample" style={{ fontWeight: 400 }}>
            The quick brown fox
          </span>
        </li>
        <li>
          <span className="styleguide-type-weights__token">--abs-weight-medium (600)</span>
          <span className="styleguide-type-weights__sample" style={{ fontWeight: 600 }}>
            The quick brown fox
          </span>
        </li>
        <li>
          <span className="styleguide-type-weights__token">--abs-weight-semibold (700)</span>
          <span className="styleguide-type-weights__sample" style={{ fontWeight: 700 }}>
            The quick brown fox
          </span>
        </li>
      </ul>

      <h3 className="styleguide-type-subhd" id="sg-type-scale">
        Type scale
      </h3>
      <div className="styleguide-type-table-wrap">
        <table className="styleguide-type-table">
          <caption className="styleguide-visually-hidden">
            Responsive type sizes and suggested line heights
          </caption>
          <thead>
            <tr>
              <th scope="col">Token</th>
              <th scope="col">Sample</th>
              <th scope="col">Line height (typical)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code className="styleguide-doc__code">--text-xs</code>
              </td>
              <td className="styleguide-type-table__sample styleguide-type-scale--xs">
                Extra small — legend tooltips, hints
              </td>
              <td>
                <code className="styleguide-doc__code">--line-height-tight</code> …{' '}
                <code className="styleguide-doc__code">--line-height-base</code>
              </td>
            </tr>
            <tr>
              <td>
                <code className="styleguide-doc__code">--text-sm</code>
              </td>
              <td className="styleguide-type-table__sample styleguide-type-scale--sm">
                Small — styleguide lede, secondary labels
              </td>
              <td>
                <code className="styleguide-doc__code">--line-height-base</code>
              </td>
            </tr>
            <tr>
              <td>
                <code className="styleguide-doc__code">--text-md</code> /{' '}
                <code className="styleguide-doc__code">--text-base</code>
              </td>
              <td className="styleguide-type-table__sample styleguide-type-scale--md">
                Medium / base — section titles on this page
              </td>
              <td>
                <code className="styleguide-doc__code">--line-height-tight</code>
              </td>
            </tr>
            <tr>
              <td>
                <code className="styleguide-doc__code">--text-lg</code>
              </td>
              <td className="styleguide-type-table__sample styleguide-type-scale--lg">
                Large — captions (.caption token size)
              </td>
              <td>
                <code className="styleguide-doc__code">--line-height-tight</code>
              </td>
            </tr>
            <tr>
              <td>
                <code className="styleguide-doc__code">--text-xl</code>
              </td>
              <td className="styleguide-type-table__sample styleguide-type-scale--xl">
                Extra large — short display lines
              </td>
              <td>
                <code className="styleguide-doc__code">--line-height-title</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="styleguide-type-subhd" id="sg-type-semantic">
        Semantic styles (production classes)
      </h3>
      <p className="styleguide-section__hint">
        Below: the same selectors / variables used on home, portfolio, CV, and modals. Portfolio hero lines sit on a dark slab so white type is visible.
      </p>

      <ul className="styleguide-type-roles">
        <li className="styleguide-type-role">
          <div className="styleguide-type-role__label">
            <code className="styleguide-doc__code">.hero-title__name</code> /{' '}
            <code className="styleguide-doc__code">.hero-title__role</code> · home hero (two lines, one style)
          </div>
          <div className="styleguide-type-role__sample">
            <div className="styleguide-type-hero-block">
              <span className="styleguide-type-sample styleguide-type-sample--hero-name">Alexander Beck</span>
              <span className="styleguide-type-sample styleguide-type-sample--hero-role">Creative Technologist</span>
            </div>
          </div>
        </li>

        <li className="styleguide-type-role">
          <div className="styleguide-type-role__label">
            <code className="styleguide-doc__code">.legend__item</code> ·{' '}
            <code className="styleguide-doc__code">--legend-font-*</code>
          </div>
          <div className="styleguide-type-role__sample">
            <span className="styleguide-type-sample styleguide-type-sample--legend">Product Systems</span>
          </div>
        </li>

        <li className="styleguide-type-role">
          <div className="styleguide-type-role__label">
            <code className="styleguide-doc__code">.ui-main-nav .footer_link</code> · main nav (×1.5 legend size)
          </div>
          <div className="styleguide-type-role__sample">
            <span className="styleguide-type-sample styleguide-type-sample--main-nav">Contact</span>
          </div>
        </li>

        <li className="styleguide-type-role">
          <div className="styleguide-type-role__label">
            <code className="styleguide-doc__code">.decorative-script</code> · intro blurb
          </div>
          <div className="styleguide-type-role__sample">
            <p className="styleguide-type-sample styleguide-type-sample--decorative">
              Philosophy line with warm rhythm and readable measure.
            </p>
          </div>
        </li>

        <li className="styleguide-type-role">
          <div className="styleguide-type-role__label">
            <code className="styleguide-doc__code">.caption</code> · corner Sarina block
          </div>
          <div className="styleguide-type-role__sample">
            <div className="caption styleguide-type-sample--caption-wrap">Studio</div>
          </div>
        </li>

        <li className="styleguide-type-role">
          <div className="styleguide-type-role__label">
            <code className="styleguide-doc__code">#time-display</code> · tabular time (nested in meta)
          </div>
          <div className="styleguide-type-role__sample">
            <span className="styleguide-type-sample styleguide-type-sample--meta-time">14:32</span>
          </div>
        </li>

        <li className="styleguide-type-role">
          <div className="styleguide-type-role__label">
            <code className="styleguide-doc__code">.edge-caption__line</code>
          </div>
          <div className="styleguide-type-role__sample">
            <div className="styleguide-type-sample styleguide-type-sample--edge-caption">Edge label · uppercase mono</div>
          </div>
        </li>

        <li className="styleguide-type-role">
          <div className="styleguide-type-role__label">
            <code className="styleguide-doc__code">.quote-display__text</code> /{' '}
            <code className="styleguide-doc__code">__author</code>
          </div>
          <div className="styleguide-type-role__sample">
            <div className="styleguide-type-quote-block">
              <p className="styleguide-type-sample styleguide-type-sample--quote-text">
                &ldquo;Design is the silent ambassador of your brand.&rdquo;
              </p>
              <p className="styleguide-type-sample styleguide-type-sample--quote-author">Paul Rand</p>
            </div>
          </div>
        </li>

        <li className="styleguide-type-role">
          <div className="styleguide-type-role__label">
            <code className="styleguide-doc__code">.legend-tooltip-output</code>
          </div>
          <div className="styleguide-type-role__sample">
            <div
              className="legend-tooltip-output styleguide-type-sample--tooltip-visible"
              role="note"
            >
              Tooltip body copy uses sans at <code className="styleguide-doc__code">--text-sm</code>.
            </div>
          </div>
        </li>

        <li className="styleguide-type-role">
          <div className="styleguide-type-role__label">
            Gate modals · <code className="styleguide-doc__code">.modal-title</code> /{' '}
            <code className="styleguide-doc__code">.modal-description</code>
          </div>
          <div className="styleguide-type-role__sample">
            <div className="styleguide-type-gate-block">
              <div className="styleguide-type-sample styleguide-type-sample--gate-title">Portfolio gate</div>
              <p className="styleguide-type-sample styleguide-type-sample--gate-desc">
                Enter access code to continue.
              </p>
            </div>
          </div>
        </li>

        <li className="styleguide-type-role">
          <div className="styleguide-type-role__label">
            Portfolio sheet · <code className="styleguide-doc__code">portfolio.css</code>
          </div>
          <div className="styleguide-type-role__sample">
            <div className="styleguide-type-portfolio-slab">
              <p className="styleguide-type-sample styleguide-type-sample--portfolio-eyebrow">Case study</p>
              <p className="styleguide-type-sample styleguide-type-sample--portfolio-title">Project title</p>
              <p className="styleguide-type-sample styleguide-type-sample--portfolio-hint">Scroll hint</p>
              <hr className="styleguide-type-portfolio-slab__rule" />
              <p className="styleguide-type-sample styleguide-type-sample--portfolio-body">
                Body copy in the drawer uses responsive clamp sizing with relaxed line height for long reads.
              </p>
              <div className="styleguide-type-sample styleguide-type-sample--portfolio-h2">Overview</div>
            </div>
          </div>
        </li>

        <li className="styleguide-type-role">
          <div className="styleguide-type-role__label">
            CV route · <code className="styleguide-doc__code">.cv-section-title</code>,{' '}
            <code className="styleguide-doc__code">.cv-entry-title</code>, body
          </div>
          <div className="styleguide-type-role__sample">
            <div className="styleguide-type-cv-block">
              <div className="styleguide-type-sample styleguide-type-sample--cv-section">Experience</div>
              <div className="styleguide-type-sample styleguide-type-sample--cv-entry">Senior designer</div>
              <p className="styleguide-type-sample styleguide-type-sample--cv-meta">2020 — Present · Berlin</p>
              <p className="styleguide-type-sample styleguide-type-sample--cv-body">
                Paragraph text uses <code className="styleguide-doc__code">--cv-body-size</code> when set; otherwise clamp
                from <code className="styleguide-doc__code">main.css</code>.
              </p>
            </div>
          </div>
        </li>
      </ul>
    </section>
  );
}
