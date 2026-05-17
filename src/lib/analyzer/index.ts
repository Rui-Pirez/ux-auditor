import { capturePage } from './browser';
import { parseHTML } from './parser';
import { runAnalysis } from './engine';
import type { AuditResult, BrowserCapture, BrowserSummary } from './types';

export type { AuditResult, Issue, CategoryResult, CategoryId, Severity, ParsedPage, BrowserCapture } from './types';

function buildBrowserSummary(b: BrowserCapture): BrowserSummary {
  return {
    renderTimeMs:            b.renderTimeMs,
    domContentLoadedMs:      b.domContentLoadedMs,
    largestContentfulPaintMs: b.largestContentfulPaintMs,
    colorContrastFailures:   b.colorContrastIssues.length,
    touchTargetFailures:     b.touchTargetIssues.length,
    consoleErrors:           b.consoleErrors.length,
    brokenResources:         b.brokenResources.length,
    bodyFontSizePx:          b.bodyFontSizePx,
    pageHeightPx:            b.pageHeightPx,
    ctaAboveFold:            b.ctaAboveFold,
  };
}

export async function analyzeUrl(rawUrl: string): Promise<AuditResult> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  const parsedUrl = new URL(url);
  const domain    = parsedUrl.hostname;
  const analyzedAt = new Date().toISOString();

  // ── 1. Full Playwright browser capture ──────────────────────────────────────
  let capture: BrowserCapture;
  try {
    capture = await capturePage(url);
    // Update URL to post-redirect final URL
    url = capture.finalUrl || url;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      url, domain, analyzedAt,
      screenshotUrl: '',
      overallScore: 0, grade: 'F',
      summary: `Playwright could not load the page: ${message}. The site may block headless browsers, require authentication, or be unreachable.`,
      categories: [], allIssues: [], quickWins: [],
      metadata: {} as never,
      browser: {
        renderTimeMs: 0, domContentLoadedMs: 0, largestContentfulPaintMs: 0,
        colorContrastFailures: 0, touchTargetFailures: 0,
        consoleErrors: 0, brokenResources: 0,
        bodyFontSizePx: 0, pageHeightPx: 0, ctaAboveFold: false,
      },
      error: message,
    };
  }

  // ── 2. Parse the fully-rendered HTML (post-JS execution) ───────────────────
  const page = parseHTML(capture.renderedHtml, url);

  // ── 3. Run all checks (HTML + browser data) ────────────────────────────────
  const analysis = runAnalysis(page, capture);

  return {
    url,
    domain,
    analyzedAt,
    screenshotUrl: capture.screenshotDataUrl,   // real JPEG data URL from Playwright
    metadata: page,
    browser: buildBrowserSummary(capture),
    ...analysis,
  };
}
