import type { ParsedPage } from './types';

// ── utilities ──────────────────────────────────────────────────────────────────

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function cleanText(html: string): string {
  return decodeEntities(stripTags(html)).trim();
}

function removeSrcAndStyle(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function metaContent(html: string, nameOrProp: string): string {
  // matches both name= and property= variants, in either attribute order
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${nameOrProp}["'][^>]+content=["']([^"']*)`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)[^>]+(?:name|property)=["']${nameOrProp}["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return decodeEntities(m[1].trim());
  }
  return '';
}

// ── main parser ────────────────────────────────────────────────────────────────

export function parseHTML(html: string, url: string): ParsedPage {
  const clean = removeSrcAndStyle(html);

  // ── Document identity ────────────────────────────────────────────────────────
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? cleanText(titleMatch[1]) : '';

  const metaDescription = metaContent(html, 'description');
  const ogTitle       = metaContent(html, 'og:title');
  const ogDescription = metaContent(html, 'og:description');
  const ogImageMatch =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)/i) ||
    html.match(/<meta[^>]+content=["']([^"']*["'][^>]+property=["']og:image)/i);
  const ogImage = ogImageMatch ? ogImageMatch[1].trim() : '';

  // ── Technical flags ──────────────────────────────────────────────────────────
  const isHttps   = url.startsWith('https://');
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const langMatch = html.match(/<html[^>]+lang=["']([^"']*)/i);
  const lang    = langMatch ? langMatch[1].trim() : '';
  const hasLang = !!lang;
  const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);
  const hasFavicon   = /<link[^>]+rel=["'][^"']*icon[^"']*["']/i.test(html);
  const hasSchemaMarkup =
    /<script[^>]+type=["']application\/ld\+json["']/i.test(html) ||
    /itemscope/i.test(html);

  // ── Headings ─────────────────────────────────────────────────────────────────
  const headings: Array<{ level: number; text: string }> = [];
  const hRe = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let hm: RegExpExecArray | null;
  while ((hm = hRe.exec(clean)) !== null) {
    const t = cleanText(hm[2]);
    if (t) headings.push({ level: parseInt(hm[1]), text: t });
  }
  const h1Tags = headings.filter(h => h.level === 1).map(h => h.text);

  // ── Images ───────────────────────────────────────────────────────────────────
  const imgRe = /<img([^>]*?)(?:\s*\/)?>/gi;
  const imagesWithoutAlt: string[] = [];
  let imagesTotal = 0;
  let imagesWithEmptyAlt = 0;
  let imagesWithoutDimensions = 0;
  let im: RegExpExecArray | null;
  while ((im = imgRe.exec(clean)) !== null) {
    imagesTotal++;
    const attrs = im[1];
    const altM  = attrs.match(/alt=["']([^"']*)["']/i);
    const srcM  = attrs.match(/src=["']([^"']*)["']/i);
    const src   = srcM ? (srcM[1].split('/').pop() || 'img').substring(0, 40) : 'img';
    if (!altM) imagesWithoutAlt.push(src);
    else if (altM[1].trim() === '') imagesWithEmptyAlt++;

    const hasW = /\bwidth=["']\d+["']|\bwidth:\s*\d+/i.test(attrs);
    const hasH = /\bheight=["']\d+["']|\bheight:\s*\d+/i.test(attrs);
    if (!hasW || !hasH) imagesWithoutDimensions++;
  }

  // ── Labels ───────────────────────────────────────────────────────────────────
  const labelForIds = new Set<string>();
  const lfRe = /<label[^>]+for=["']([^"']*)["']/gi;
  let lf: RegExpExecArray | null;
  while ((lf = lfRe.exec(clean)) !== null) labelForIds.add(lf[1]);

  // Also count wrapped-label patterns
  const wrappedRe = /<label[^>]*>[\s\S]*?<input[\s\S]*?<\/label>/gi;
  const wrappedIds = new Set<string>();
  let wr: RegExpExecArray | null;
  while ((wr = wrappedRe.exec(clean)) !== null) {
    const idM = wr[0].match(/<input[^>]+id=["']([^"']*)["']/i);
    if (idM) wrappedIds.add(idM[1]);
  }

  const SKIP_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image']);
  const inputsWithoutLabel: string[] = [];
  let inputsTotal = 0;
  const inRe = /<input([^>]*?)(?:\s*\/)?>/gi;
  let inp: RegExpExecArray | null;
  while ((inp = inRe.exec(clean)) !== null) {
    const attrs  = inp[1];
    const typeM  = attrs.match(/type=["']([^"']*)["']/i);
    const type   = typeM ? typeM[1].toLowerCase() : 'text';
    if (SKIP_TYPES.has(type)) continue;
    inputsTotal++;

    const idM    = attrs.match(/\bid=["']([^"']*)["']/i);
    const nameM  = attrs.match(/\bname=["']([^"']*)["']/i);
    const phM    = attrs.match(/placeholder=["']([^"']*)["']/i);
    const ariaL  = /aria-label=["'][^"']+["']/i.test(attrs);
    const ariaLB = /aria-labelledby=["'][^"']+["']/i.test(attrs);
    const id     = idM ? idM[1] : '';
    const labeled = ariaL || ariaLB || (id && (labelForIds.has(id) || wrappedIds.has(id)));
    if (!labeled) {
      inputsWithoutLabel.push((nameM?.[1] || phM?.[1] || type).substring(0, 30));
    }
  }

  // ── Buttons ──────────────────────────────────────────────────────────────────
  const buttons: string[] = [];
  const btnRe = /<button([^>]*)>([\s\S]*?)<\/button>/gi;
  let btn: RegExpExecArray | null;
  while ((btn = btnRe.exec(clean)) !== null) {
    const attrs = btn[1];
    const t = cleanText(btn[2]);
    // Use visible text first; fall back to aria-label for icon-only buttons
    const ariaLabelM = attrs.match(/aria-label=["']([^"']*)["']/i);
    const label = t || (ariaLabelM ? ariaLabelM[1].trim() : '');
    if (label) buttons.push(label.substring(0, 60));
  }

  // ── Forms ────────────────────────────────────────────────────────────────────
  const formMatches = clean.match(/<form[^>]*>[\s\S]*?<\/form>/gi) || [];
  let formFields = 0;
  for (const f of formMatches) {
    formFields +=
      (f.match(/<input[^>]*/gi) || []).filter(i => {
        const t = (i.match(/type=["']([^"'"]*)["']/i)?.[1] ?? 'text').toLowerCase();
        return !SKIP_TYPES.has(t);
      }).length +
      (f.match(/<textarea[^>]*/gi) || []).length +
      (f.match(/<select[^>]*/gi) || []).length;
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  const navItems: string[] = [];
  const navM = clean.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);
  if (navM) {
    const nlRe = /<a[^>]*>([\s\S]*?)<\/a>/gi;
    let nl: RegExpExecArray | null;
    while ((nl = nlRe.exec(navM[1])) !== null) {
      const t = cleanText(nl[1]);
      if (t && t.length > 0 && t.length < 120) navItems.push(t);
    }
  }

  // ── Booleans ─────────────────────────────────────────────────────────────────
  const hasSearch =
    /<input[^>]+type=["']search["']/i.test(clean) ||
    /(?:class|id|aria-label)=["'][^"']*(search)[^"']*["']/i.test(clean) ||
    /<[^>]+role=["']search["']/i.test(clean);

  const hasBreadcrumbs =
    /breadcrumb/i.test(clean) ||
    /<[^>]+role=["']navigation["'][^>]+aria-label=["'][^"']*breadcrumb/i.test(clean);

  const hasFooter = /<footer[^>]*>/i.test(clean);

  const hasPrivacyPolicy = /privacy\s*policy|href=["'][^"']*privacy/i.test(clean);
  const hasTerms         = /terms\s*(of\s*(service|use))?|href=["'][^"']*terms/i.test(clean);

  const hasContactInfo =
    /mailto:/i.test(clean) ||
    /tel:/i.test(clean) ||
    /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i.test(clean) ||
    /href=["'][^"']*\/(contact|get-in-touch|reach-us|support)[^"']*["']/i.test(clean) ||
    // Proper phone number format (not zip codes or years): requires area-code pattern
    /\+?1?\s*\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/.test(clean);

  const hasCopyright = /©|&copy;|\bcopyright\b/i.test(html);

  const hasSocialMedia =
    /(twitter\.com|x\.com|facebook\.com|instagram\.com|linkedin\.com|youtube\.com|tiktok\.com|github\.com)/i.test(clean);

  const hasSocialProof =
    // Dedicated testimonial section
    /class=["'][^"']*(testimonial|review-card|quote-block|customer-quote)[^"']*["']/i.test(clean) ||
    // Aggregated ratings (e.g. "4.8/5", "★★★★★", "4.9 out of 5")
    /[45]\s*[\./]\s*5\s*(stars?|rating)?/i.test(clean) ||
    /★{3,}|⭐{3,}/i.test(clean) ||
    // Third-party review platforms
    /(trustpilot|g2\.com|capterra|getapp|producthunt|appsumo)/i.test(clean) ||
    // Quoted testimonial pattern: a sentence in quotes followed by a name dash
    /"[^"]{30,}"[\s\S]{0,50}[-–]\s*[A-Z][a-z]+/m.test(clean) ||
    // Social proof stats
    /\b([\d,]+\+?\s*(customers?|users?|companies|teams?|businesses?))\s*(trust|use|love|rely)/i.test(clean);

  const hasSkipLink =
    /skip[- ]to[- ](main|content)/i.test(clean) ||
    /<a[^>]+href=["']#(main|content|maincontent)/i.test(clean);

  // ── Structure ─────────────────────────────────────────────────────────────────
  const sectionCount =
    (clean.match(/<section[^>]*>/gi) || []).length +
    (clean.match(/<article[^>]*>/gi) || []).length +
    (clean.match(/<main[^>]*>/gi) || []).length;
  const listCount = (clean.match(/<(?:ul|ol)[^>]*>/gi) || []).length;
  const tableCount = (clean.match(/<table[^>]*>/gi) || []).length;

  // ── Links ─────────────────────────────────────────────────────────────────────
  const GENERIC = new Set(['click here', 'here', 'read more', 'learn more', 'more', 'link', 'this', 'details', 'info', 'see more', 'view details', 'view all', 'explore', 'find out more', 'get it', 'show more', 'continue reading']);
  const linkRe = /<a([^>]*)>([\s\S]*?)<\/a>/gi;
  const genericLinks: string[] = [];
  let externalLinksTotal = 0;
  let externalLinksWithoutNoopener = 0;
  let totalLinks = 0;
  let lk: RegExpExecArray | null;
  const origin = (() => { try { return new URL(url).origin; } catch { return ''; } })();
  while ((lk = linkRe.exec(clean)) !== null) {
    totalLinks++;
    const attrs = lk[1];
    const text  = cleanText(lk[2]).toLowerCase();
    const href  = attrs.match(/href=["']([^"']*)["']/i)?.[1] ?? '';
    const isExternal = href && /^https?:\/\//i.test(href) && !href.startsWith(origin);
    if (isExternal) {
      externalLinksTotal++;
      const hasTarget  = /target=["']_blank["']/i.test(attrs);
      const hasNoopen  = /rel=["'][^"']*(noopener|noreferrer)[^"']*["']/i.test(attrs);
      if (hasTarget && !hasNoopen) externalLinksWithoutNoopener++;
    }
    if (text && GENERIC.has(text)) genericLinks.push(text);
  }

  // ── Iframes ──────────────────────────────────────────────────────────────────
  let iframesWithoutTitle = 0;
  const ifRe = /<iframe([^>]*)>/gi;
  let ifm: RegExpExecArray | null;
  while ((ifm = ifRe.exec(clean)) !== null) {
    if (!/title=["'][^"']+["']/i.test(ifm[1])) iframesWithoutTitle++;
  }

  // ── Autoplay media ────────────────────────────────────────────────────────────
  const hasAutoplayMedia = /<(?:video|audio)[^>]+autoplay/i.test(clean);

  // ── Word count ────────────────────────────────────────────────────────────────
  const bodyM = clean.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyText = bodyM ? stripTags(bodyM[1]) : stripTags(clean);
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  // ── CTA buttons ───────────────────────────────────────────────────────────────
  const CTA_RE = /\b(sign\s*up|get\s+started|start|try|buy|subscribe|join|create|register|download|get|claim|book|schedule|contact\s*us|apply|demo|watch|upgrade|free\s*trial|start\s*free|learn\s*more|explore)\b/i;
  const ctaButtons: string[] = [];
  for (const b of buttons) { if (CTA_RE.test(b)) ctaButtons.push(b); }
  // Also catch <a> styled as buttons
  const aBtn = /<a[^>]+(btn|button|cta)[^>]*>([\s\S]*?)<\/a>/gi;
  let ab: RegExpExecArray | null;
  while ((ab = aBtn.exec(clean)) !== null) {
    const t = cleanText(ab[2]);
    if (t && CTA_RE.test(t)) ctaButtons.push(t.substring(0, 60));
  }

  return {
    title, metaDescription, ogTitle, ogDescription, ogImage, lang,
    isHttps, hasViewport, hasLang, hasCanonical, hasFavicon, hasSchemaMarkup,
    h1Tags, headings,
    imagesTotal, imagesWithoutAlt, imagesWithEmptyAlt, imagesWithoutDimensions,
    inputsTotal, inputsWithoutLabel, buttons, formFields,
    navItems, hasSearch, hasBreadcrumbs, hasFooter, sectionCount, listCount, tableCount,
    totalLinks, externalLinksTotal, externalLinksWithoutNoopener, genericLinks,
    iframesWithoutTitle, hasAutoplayMedia,
    hasPrivacyPolicy, hasTerms, hasContactInfo, hasCopyright, hasSocialMedia, hasSocialProof, hasSkipLink,
    wordCount, ctaButtons,
  };
}
