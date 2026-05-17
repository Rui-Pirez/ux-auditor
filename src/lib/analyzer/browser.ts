import type { Browser, Page } from 'playwright';
import type { BrowserCapture, ContrastIssue, TouchTargetIssue, HeadingEntry, A11yNode } from './types';

// ── Singleton browser ─────────────────────────────────────────────────────────

let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser?.isConnected()) return _browser;
  const { chromium } = await import('playwright');
  _browser = await chromium.launch({
    channel: 'chrome',   // Use system Chrome — no download needed
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });
  _browser.on('disconnected', () => { _browser = null; });
  return _browser;
}

// ── In-browser evaluation script ─────────────────────────────────────────────
// This function runs INSIDE the browser via page.evaluate(), so it must be
// self-contained (no closures over Node.js variables).

interface BrowserEvalResult {
  colorContrastIssues: ContrastIssue[];
  touchTargetIssues: TouchTargetIssue[];
  headingsFromDOM: HeadingEntry[];
  bodyFontSizePx: number;
  h1FontSizePx: number;
  ctaAboveFold: boolean;
  renderTimeMs: number;
  domContentLoadedMs: number;
  pageHeightPx: number;
}

function inBrowserEval(): BrowserEvalResult {
  // ── Color utility ──────────────────────────────────────────────────────────
  function parseRGB(css: string): [number, number, number] | null {
    const m = css.match(/rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
    return m ? [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])] : null;
  }

  function isTransparent(css: string): boolean {
    if (!css || css === 'transparent') return true;
    const m = css.match(/rgba\([^)]+,\s*([\d.]+)\)/);
    return m ? parseFloat(m[1]) < 0.05 : false;
  }

  function linearize(v: number): number {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }

  function luminance([r, g, b]: [number, number, number]): number {
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
  }

  function contrastRatio(fg: [number, number, number] | null, bg: [number, number, number] | null): number {
    if (!fg || !bg) return 21;
    const L1 = luminance(fg), L2 = luminance(bg);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  }

  function effectiveBg(el: Element): string {
    let cur: Element | null = el;
    while (cur && cur.tagName !== 'HTML') {
      const bg = window.getComputedStyle(cur).backgroundColor;
      if (!isTransparent(bg)) return bg;
      cur = cur.parentElement;
    }
    return 'rgb(255, 255, 255)';
  }

  function isVisible(el: Element): boolean {
    const s = window.getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  // ── Color contrast ─────────────────────────────────────────────────────────
  const seenColorPairs = new Set<string>();
  const colorContrastIssues: ContrastIssue[] = [];

  const TEXT_SELECTORS = 'p, li, h1, h2, h3, h4, h5, h6, a, button, label, span, td, th, div[class*="text"], [class*="body"], [class*="desc"]';
  const textEls = Array.from(document.querySelectorAll<Element>(TEXT_SELECTORS));

  for (const el of textEls) {
    if (!isVisible(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.top > window.innerHeight * 4) break; // stop scanning well below fold

    const text = (el as HTMLElement).innerText?.trim();
    if (!text || text.length < 3) continue;
    // Skip elements whose text is entirely inside a child (avoid double-counting)
    if (el.children.length > 0 && (el as HTMLElement).innerText?.trim() === (el.children[0] as HTMLElement).innerText?.trim()) continue;

    const style = window.getComputedStyle(el);
    const textCSS = style.color;
    const bgCSS   = effectiveBg(el);
    const pairKey = `${textCSS}|${bgCSS}`;
    if (seenColorPairs.has(pairKey)) continue;
    seenColorPairs.add(pairKey);

    const fg = parseRGB(textCSS);
    const bg = parseRGB(bgCSS);
    const ratio = Math.round(contrastRatio(fg, bg) * 100) / 100;

    const fontSize   = parseFloat(style.fontSize);
    const fontWeight = parseInt(style.fontWeight || '400', 10);
    const isLarge    = fontSize >= 24 || (fontSize >= 18.67 && fontWeight >= 700);
    const threshold  = isLarge ? 3.0 : 4.5;

    if (ratio < threshold) {
      colorContrastIssues.push({
        text: text.substring(0, 60),
        textColor: textCSS,
        bgColor:   bgCSS,
        ratio,
        required:    threshold,
        fontSize:    Math.round(fontSize),
        isLargeText: isLarge,
        tag: el.tagName.toLowerCase(),
      });
      if (colorContrastIssues.length >= 12) break;
    }
  }

  // ── Touch targets ──────────────────────────────────────────────────────────
  const touchTargetIssues: TouchTargetIssue[] = [];
  const INTERACTIVE = 'a[href], button, [role="button"], [role="link"], input:not([type="hidden"]), select, textarea';
  const TOUCH_MIN = 44;

  for (const el of Array.from(document.querySelectorAll<Element>(INTERACTIVE))) {
    if (!isVisible(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.top > window.innerHeight * 3) break;
    if (rect.width < TOUCH_MIN || rect.height < TOUCH_MIN) {
      const rawText = (el as HTMLElement).innerText?.trim()
        || (el as HTMLElement).getAttribute('aria-label')
        || (el as HTMLInputElement).placeholder
        || el.tagName;
      touchTargetIssues.push({
        text:   rawText.substring(0, 40),
        width:  Math.round(rect.width),
        height: Math.round(rect.height),
        tag:    el.tagName.toLowerCase(),
      });
      if (touchTargetIssues.length >= 12) break;
    }
  }

  // ── Headings with real computed font sizes ─────────────────────────────────
  const headingsFromDOM: HeadingEntry[] = [];
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6'))) {
    if (!isVisible(el)) continue;
    headingsFromDOM.push({
      level:    parseInt(el.tagName[1], 10),
      text:     el.innerText?.trim().substring(0, 100) ?? '',
      fontSize: Math.round(parseFloat(window.getComputedStyle(el).fontSize)),
    });
  }

  // ── Font sizes ─────────────────────────────────────────────────────────────
  const bodyFontSizePx = Math.round(parseFloat(window.getComputedStyle(document.body).fontSize));
  const firstH1 = document.querySelector<HTMLElement>('h1');
  const h1FontSizePx = firstH1
    ? Math.round(parseFloat(window.getComputedStyle(firstH1).fontSize))
    : 0;

  // ── CTA above the fold ─────────────────────────────────────────────────────
  const CTA_TEXT_RE = /sign\s*up|get\s+started|start|try\s+(free|now)|buy|subscribe|join|demo|free\s+trial|book|contact\s+us|apply|download/i;
  const vh = window.innerHeight;
  let ctaAboveFold = false;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('button, a[href], [role="button"]'))) {
    const text = el.innerText?.trim() ?? '';
    if (!CTA_TEXT_RE.test(text)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.bottom <= vh + 20 && rect.top >= -20) {
      ctaAboveFold = true;
      break;
    }
  }

  // ── Timing ────────────────────────────────────────────────────────────────
  const timing = performance.timing;
  const nav    = timing.navigationStart;
  const renderTimeMs        = Math.max(0, (timing.domComplete || 0) - nav);
  const domContentLoadedMs  = Math.max(0, (timing.domContentLoadedEventEnd || 0) - nav);

  // ── Page height ───────────────────────────────────────────────────────────
  const pageHeightPx = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
  );

  return {
    colorContrastIssues,
    touchTargetIssues,
    headingsFromDOM,
    bodyFontSizePx,
    h1FontSizePx,
    ctaAboveFold,
    renderTimeMs,
    domContentLoadedMs,
    pageHeightPx,
  };
}

// ── LCP via PerformanceObserver (injected before navigation) ──────────────────

const LCP_INJECTION = `
  window.__uxAuditorLCP = 0;
  new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      window.__uxAuditorLCP = Math.max(window.__uxAuditorLCP, entry.startTime);
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
`;

// ── Main capture function ─────────────────────────────────────────────────────

export async function capturePage(url: string): Promise<BrowserCapture> {
  const browser = await getBrowser();
  const page: Page = await browser.newPage();

  const consoleErrors: string[] = [];
  const brokenResources: string[] = [];
  let resourceCount = 0;

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('ERR_') && consoleErrors.length < 10) {
        consoleErrors.push(text.substring(0, 200));
      }
    }
  });

  page.on('requestfailed', req => {
    const url = req.url();
    if (!/analytics|tracking|ads|pixel|beacon/i.test(url) && brokenResources.length < 10) {
      brokenResources.push(`${req.method()} ${url.substring(0, 120)} – ${req.failure()?.errorText ?? 'failed'}`);
    }
  });

  page.on('response', () => { resourceCount++; });

  try {
    // Inject LCP observer before navigation
    await page.addInitScript(LCP_INJECTION);

    // Set realistic viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Set a realistic user agent
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    // Navigate, wait until network is quiet
    let responseStatus = 0;
    try {
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 25000,
      });
      responseStatus = response?.status() ?? 0;
      url = page.url(); // capture final URL after redirects
    } catch {
      // Page may still be usable even if networkidle timed out
    }

    // Let JS settle
    await page.waitForTimeout(800);

    // ── Full-page screenshot ────────────────────────────────────────────────
    // Scroll back to top so the screenshot starts at the hero
    await page.evaluate(() => window.scrollTo(0, 0));

    const ssBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 72,   // lower quality keeps full-page file size manageable
      fullPage: true,
    });
    const screenshotDataUrl = `data:image/jpeg;base64,${ssBuffer.toString('base64')}`;

    // ── Rendered HTML ───────────────────────────────────────────────────────
    const renderedHtml = await page.content();

    // ── Accessibility tree ──────────────────────────────────────────────────
    let accessibilityTree: A11yNode | null = null;
    const a11yViolations: string[] = [];
    try {
      // page.accessibility.snapshot() returns the full a11y tree
      accessibilityTree = await (page as any).accessibility.snapshot({ interestingOnly: false }) as A11yNode | null;
      if (accessibilityTree) {
        analyzeA11yTree(accessibilityTree, a11yViolations);
      }
    } catch {
      // accessibility API unavailable in this context
    }

    // ── Computed styles evaluation ──────────────────────────────────────────
    const evalResult = await page.evaluate(inBrowserEval).catch(() => null);

    // ── LCP ────────────────────────────────────────────────────────────────
    const lcpMs = await page.evaluate(() => (window as any).__uxAuditorLCP ?? 0).catch(() => 0);

    await page.close();

    return {
      screenshotDataUrl,
      renderedHtml,
      finalUrl: url,
      responseStatus,
      colorContrastIssues:   evalResult?.colorContrastIssues  ?? [],
      touchTargetIssues:     evalResult?.touchTargetIssues    ?? [],
      headingsFromDOM:       evalResult?.headingsFromDOM       ?? [],
      bodyFontSizePx:        evalResult?.bodyFontSizePx        ?? 16,
      h1FontSizePx:          evalResult?.h1FontSizePx          ?? 0,
      ctaAboveFold:          evalResult?.ctaAboveFold          ?? false,
      renderTimeMs:          evalResult?.renderTimeMs          ?? 0,
      domContentLoadedMs:    evalResult?.domContentLoadedMs    ?? 0,
      largestContentfulPaintMs: Math.round(lcpMs),
      pageHeightPx:          evalResult?.pageHeightPx          ?? 0,
      accessibilityTree,
      a11yViolations,
      consoleErrors,
      brokenResources,
      resourceCount,
      viewportWidth:  1280,
      viewportHeight: 800,
    };
  } catch (err) {
    await page.close().catch(() => {});
    throw err;
  }
}

// ── Walk the a11y tree for structural violations ───────────────────────────────

function analyzeA11yTree(node: A11yNode, violations: string[], depth = 0): void {
  if (depth > 30 || violations.length > 20) return;

  const role = node.role?.toLowerCase() ?? '';

  // Images without accessible names
  if (role === 'img' && !node.name) {
    violations.push('Image element has no accessible name (missing alt text in a11y tree)');
  }

  // Buttons without accessible names
  if ((role === 'button' || role === 'link') && !node.name?.trim()) {
    violations.push(`${role.charAt(0).toUpperCase() + role.slice(1)} has no accessible name`);
  }

  // Generic non-landmark interactive that should have a role
  if (role === 'textbox' && !node.name?.trim()) {
    violations.push('Text input has no accessible label');
  }

  for (const child of node.children ?? []) {
    analyzeA11yTree(child, violations, depth + 1);
  }
}
