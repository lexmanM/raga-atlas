/*
 * Rāga Atlas UX auditor
 *
 * Measures what a UX review should never guess at: the type scale actually in
 * use, spacing values off the grid, contrast failures against the real
 * composited background, undersized tap targets, unlabeled controls, heading
 * order breaks, and horizontal overflow.
 *
 * Usage -- no dependencies, no build step, no tooling beyond a browser:
 *
 *   1. npm run dev
 *   2. Open the page, then devtools (Cmd+Opt+I / Ctrl+Shift+I)
 *   3. Paste the contents of this file into the console and press Enter
 *
 * Returns a report object and logs a readable summary. Any browser automation
 * that can evaluate a script in the page can run it the same way. It only
 * reads -- it never mutates the page and never opens a blocking dialog.
 *
 * The standards it measures against are documented in docs/ux/.
 */
(() => {
  const GRID = [0, 1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 96, 112, 128, 160, 192];
  const MAX_SAMPLES = 6;
  const report = { url: location.href, viewport: `${innerWidth}x${innerHeight}` };

  /* ---------- color ---------- */
  // Normalize through a canvas so every CSS color syntax the browser supports
  // resolves correctly -- modern frameworks emit oklch()/color(srgb ...), which
  // a naive numeric regex silently turns into garbage.
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = 1;
  const ctx = cvs.getContext('2d', { willReadFrequently: true });
  const cache = new Map();
  const parse = (str) => {
    const key = String(str);
    if (cache.has(key)) return cache.get(key);
    let out = null;
    if (key && key !== 'transparent' && key !== 'none') {
      try {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = '#000';
        ctx.fillStyle = key; // invalid values leave the previous fillStyle in place
        if (ctx.fillStyle !== '#000' || /^(#000000|#000|black|rgba?\(0,? ?0,? ?0)/i.test(key.trim())) {
          ctx.fillRect(0, 0, 1, 1);
          const d = ctx.getImageData(0, 0, 1, 1).data;
          out = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
          if (out.a > 0 && out.a < 1) {
            // getImageData returns premultiplied-ish values; recover the source color
            out.r = Math.min(255, out.r / out.a);
            out.g = Math.min(255, out.g / out.a);
            out.b = Math.min(255, out.b / out.a);
          }
        }
      } catch { out = null; }
    }
    if (out === null) {
      const m = key.match(/-?[\d.]+/g);
      if (m && m.length >= 3) out = { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 };
    }
    cache.set(key, out);
    return out;
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const hex = (c) =>
    '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

  const bgOf = (el) => {
    const layers = [];
    let n = el;
    while (n && n.nodeType === 1) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
      n = n.parentElement;
    }
    if (!layers.length || layers[layers.length - 1].a < 1) layers.push({ r: 255, g: 255, b: 255, a: 1 });
    let out = layers[layers.length - 1];
    for (let i = layers.length - 2; i >= 0; i--) out = over(layers[i], out);
    return out;
  };

  /* ---------- element set ---------- */
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const all = [...document.querySelectorAll('body *')].filter(
    (el) => !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|BR|HEAD)$/.test(el.tagName) && visible(el)
  );
  const hasOwnText = (el) =>
    [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
  const sel = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const cls = (el.className && typeof el.className === 'string')
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
      : '';
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };
  const snippet = (el) => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);

  /* ---------- 1. type scale ---------- */
  const sizes = new Map(), weights = new Map(), families = new Map(), lineHeights = [];
  const measures = [];
  for (const el of all) {
    if (!hasOwnText(el)) continue;
    const s = getComputedStyle(el);
    const fs = Math.round(parseFloat(s.fontSize) * 10) / 10;
    sizes.set(fs, (sizes.get(fs) || 0) + 1);
    weights.set(s.fontWeight, (weights.get(s.fontWeight) || 0) + 1);
    families.set(s.fontFamily.split(',')[0].replace(/["']/g, ''), 1);
    const lh = parseFloat(s.lineHeight);
    if (lh) lineHeights.push({ size: fs, lh: Math.round((lh / fs) * 100) / 100 });
    // measure: characters per line, for real prose only
    const text = (el.textContent || '').trim();
    if (text.length > 120 && el.getBoundingClientRect().width > 200) {
      const chars = Math.round(el.getBoundingClientRect().width / (fs * 0.5));
      if (chars > 75 || chars < 45) measures.push({ el: sel(el), approxChars: chars, text: snippet(el) });
    }
  }
  report.type = {
    distinctSizes: [...sizes.keys()].sort((a, b) => a - b),
    sizeUsage: Object.fromEntries([...sizes.entries()].sort((a, b) => b[1] - a[1])),
    distinctWeights: [...weights.keys()].sort((a, b) => Number(a) - Number(b)),
    families: [...families.keys()],
    verdict:
      sizes.size > 7 ? `SPRAWL: ${sizes.size} distinct font sizes — a scale should show 4-6`
      : sizes.size < 2 ? 'FLAT: one font size — no typographic hierarchy'
      : `ok (${sizes.size} sizes)`,
    longOrShortMeasure: measures.slice(0, MAX_SAMPLES),
  };

  /* ---------- 2. spacing grid ---------- */
  const offGrid = new Map();
  for (const el of all) {
    const s = getComputedStyle(el);
    for (const prop of ['paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginBottom','gap','rowGap','columnGap']) {
      const raw = s[prop];
      if (!raw || !raw.endsWith('px')) continue;
      const v = Math.round(parseFloat(raw) * 100) / 100;
      if (!v || GRID.includes(Math.round(v))) continue;
      if (Math.abs(v - Math.round(v)) > 0.01 && v < 1) continue; // sub-pixel noise
      const key = `${v}px`;
      if (!offGrid.has(key)) offGrid.set(key, { count: 0, samples: [] });
      const rec = offGrid.get(key);
      rec.count++;
      if (rec.samples.length < 3) rec.samples.push(`${sel(el)} { ${prop}: ${raw} }`);
    }
  }
  report.spacing = {
    offGridValues: Object.fromEntries(
      [...offGrid.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 10)
    ),
    verdict: offGrid.size === 0 ? 'ok — all spacing on a 4px grid'
      : `${offGrid.size} off-grid spacing values in use`,
  };

  /* ---------- 3. contrast ---------- */
  const contrast = [];
  for (const el of all) {
    if (!hasOwnText(el)) continue;
    const s = getComputedStyle(el);
    const fg0 = parse(s.color);
    if (!fg0) continue;
    const bg = bgOf(el);
    const fg = fg0.a < 1 ? over(fg0, bg) : fg0;
    const fs = parseFloat(s.fontSize);
    const bold = +s.fontWeight >= 700;
    const large = fs >= 24 || (bold && fs >= 18.66);
    const need = large ? 3 : 4.5;
    const got = Math.round(ratio(fg, bg) * 100) / 100;
    if (got < need) {
      contrast.push({
        el: sel(el), text: snippet(el),
        fg: hex(fg), bg: hex(bg),
        fontSize: `${Math.round(fs)}px`, ratio: got, required: need,
        criterion: large ? '1.4.3 large text' : '1.4.3 body text',
      });
    }
  }
  // placeholders, which the loop above cannot see
  for (const el of document.querySelectorAll('input[placeholder], textarea[placeholder]')) {
    if (!visible(el)) continue;
    const ph = getComputedStyle(el, '::placeholder');
    const c = parse(ph.color);
    if (!c) continue;
    const bg = bgOf(el);
    const got = Math.round(ratio(c.a < 1 ? over(c, bg) : c, bg) * 100) / 100;
    if (got < 4.5) contrast.push({ el: sel(el), text: `placeholder: "${el.placeholder}"`, fg: hex(c), bg: hex(bg), ratio: got, required: 4.5, criterion: '1.4.3 placeholder' });
  }
  const sortedContrast = contrast.sort((a, b) => a.ratio - b.ratio);
  report.contrast = {
    failures: sortedContrast.slice(0, 25),
    total: contrast.length,
    truncated: contrast.length > 25 ? `showing the 25 worst of ${contrast.length}` : false,
    verdict: contrast.length ? `${contrast.length} text elements below AA contrast` : 'ok — no AA contrast failures found',
  };

  /* ---------- 4. tap targets ---------- */
  const interactiveSel = 'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link], [role=tab], [role=checkbox], [role=switch], [tabindex]:not([tabindex="-1"])';
  const interactive = [...document.querySelectorAll(interactiveSel)].filter(visible);
  const small = [];
  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (w < 24 || h < 24) small.push({ el: sel(el), text: snippet(el), size: `${w}x${h}`, severity: 'below WCAG 2.5.8 (24px)' });
    else if (w < 44 || h < 44) small.push({ el: sel(el), text: snippet(el), size: `${w}x${h}`, severity: 'below 44px design target' });
  }
  // Sort the WCAG-floor breaches to the front so truncation can never hide them.
  small.sort((a, b) => Number(b.severity.includes('WCAG')) - Number(a.severity.includes('WCAG')));
  report.tapTargets = {
    total: interactive.length,
    undersized: small.slice(0, 20),
    truncated: small.length > 20 ? `showing 20 of ${small.length}` : false,
    verdict: small.filter((s) => s.severity.includes('WCAG')).length
      ? `${small.filter((s) => s.severity.includes('WCAG')).length} targets below the 24px WCAG floor`
      : small.length ? `${small.length} targets under the 44px design target` : 'ok',
  };

  /* ---------- 5. labels, alt, focus ---------- */
  const named = (el) => {
    if (el.getAttribute('aria-label')?.trim()) return true;
    const lb = el.getAttribute('aria-labelledby');
    if (lb && lb.split(/\s+/).some((id) => document.getElementById(id))) return true;
    if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return true;
    if (el.closest('label')) return true;
    if (el.title?.trim()) return true;
    return (el.textContent || '').trim().length > 0;
  };
  const unlabeled = interactive.filter((el) => !named(el)).map((el) => ({ el: sel(el), html: el.outerHTML.slice(0, 90) }));
  const noAlt = [...document.querySelectorAll('img')].filter(visible)
    .filter((img) => img.getAttribute('alt') === null)
    .map((img) => ({ src: (img.currentSrc || img.src || '').split('/').pop().slice(0, 50) }));
  const divButtons = [...document.querySelectorAll('div[onclick], span[onclick]')].filter(visible).map(sel);
  const outlineNone = interactive.filter((el) => {
    const s = getComputedStyle(el);
    return (s.outlineStyle === 'none' || parseFloat(s.outlineWidth) === 0) && s.boxShadow === 'none';
  }).length;

  report.semantics = {
    unlabeledControls: unlabeled.slice(0, 15),
    unlabeledTotal: unlabeled.length,
    imagesMissingAltAttribute: noAlt.slice(0, 15),
    imagesMissingAltTotal: noAlt.length,
    clickHandlersOnNonInteractiveTags: divButtons.slice(0, 10),
    note: outlineNone ? `${outlineNone}/${interactive.length} controls have no resting outline — verify :focus-visible is styled (this check cannot see focus state)` : null,
  };

  /* ---------- 6. heading order ---------- */
  const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible);
  const order = [], breaks = [];
  let prev = 0;
  for (const h of heads) {
    const lvl = +h.tagName[1];
    order.push(`h${lvl}: ${snippet(h)}`);
    if (prev && lvl > prev + 1) breaks.push(`h${prev} -> h${lvl} at "${snippet(h)}"`);
    prev = lvl;
  }
  const h1s = heads.filter((h) => h.tagName === 'H1').length;
  report.headings = {
    outline: order.slice(0, 30),
    skippedLevels: breaks,
    h1Count: h1s,
    verdict: h1s !== 1 ? `${h1s} h1 elements — expected exactly 1` : breaks.length ? `${breaks.length} skipped heading levels` : 'ok',
  };

  /* ---------- 7. overflow / responsive ---------- */
  const docW = document.documentElement.clientWidth;
  const overflowing = all.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.right > docW + 2 && r.width > 8 && getComputedStyle(el).position !== 'fixed';
  }).map((el) => ({ el: sel(el), right: Math.round(el.getBoundingClientRect().right), text: snippet(el) }));
  report.layout = {
    viewportWidth: docW,
    horizontalScroll: document.documentElement.scrollWidth > docW + 2,
    overflowingElements: overflowing.slice(0, 10),
    verdict: document.documentElement.scrollWidth > docW + 2
      ? `page scrolls horizontally (${document.documentElement.scrollWidth}px content in ${docW}px viewport)` : 'ok',
  };

  /* ---------- summary ---------- */
  const lines = [
    `ux-review audit — ${location.href} @ ${innerWidth}x${innerHeight}`,
    `  type:      ${report.type.verdict}`,
    `  spacing:   ${report.spacing.verdict}`,
    `  contrast:  ${report.contrast.verdict}`,
    `  targets:   ${report.tapTargets.verdict}`,
    `  headings:  ${report.headings.verdict}`,
    `  layout:    ${report.layout.verdict}`,
    `  unlabeled controls: ${unlabeled.length} | img without alt attr: ${noAlt.length} | non-semantic click handlers: ${divButtons.length}`,
  ];
  report.summary = lines.join('\n');
  console.log(report.summary);
  return report;
})();
