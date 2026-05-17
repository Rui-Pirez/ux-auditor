import type { Issue, CategoryId, CategoryResult, ParsedPage, AuditResult, BrowserCapture } from './types';
import { CATEGORY_LABELS, CATEGORY_BENCHMARKS, CATEGORY_WEIGHTS } from './types';

type CheckFn = (page: ParsedPage) => Issue[];
type BrowserCheckFn = (capture: BrowserCapture) => Issue[];

// ══ ACCESSIBILITY ══════════════════════════════════════════════════════════════

const checkMissingAltText: CheckFn = p => {
  if (!p.imagesWithoutAlt.length) return [];
  const shown = p.imagesWithoutAlt.slice(0, 3).map(s => `\`${s}\``).join(', ');
  const more  = p.imagesWithoutAlt.length > 3 ? ` and ${p.imagesWithoutAlt.length - 3} more` : '';
  return [{
    id: 'a11y-missing-alt', category: 'accessibility', severity: 'critical',
    impact: 'High', principle: 'WCAG 1.1.1 – Non-text Content',
    title: `${p.imagesWithoutAlt.length} image${p.imagesWithoutAlt.length > 1 ? 's' : ''} missing alt text`,
    whyItMatters: 'Screen readers read alt text aloud to blind users. Without it, those users receive zero information about the image. Google also uses alt text to index images — missing alt text is both an accessibility failure and an SEO gap.',
    evidence: `${p.imagesWithoutAlt.length} <img> elements have no alt attribute: ${shown}${more}. These are completely invisible to assistive technologies and search engine crawlers.`,
    specificFix: `Add descriptive alt attributes: alt="[what the image shows in context]". For purely decorative images use alt="" (empty string). For ${p.imagesWithoutAlt[0]}, write something like: alt="[Team collaborating on design]" rather than leaving it absent.`,
    quickWin: p.imagesWithoutAlt.length <= 3,
    scoreDeduction: Math.min(20, 8 + p.imagesWithoutAlt.length * 3),
  }];
};

const checkMissingTitle: CheckFn = p => {
  if (p.title) return [];
  return [{
    id: 'a11y-missing-title', category: 'accessibility', severity: 'critical',
    impact: 'High', principle: 'WCAG 2.4.2 – Page Titled',
    title: 'Page is missing a <title> tag',
    whyItMatters: 'The <title> is the first element screen readers announce when loading a page. It also appears in browser tabs, bookmarks, and search result headlines. Omitting it renders the page invisible to search engines and disorienting for assistive tech users.',
    evidence: 'No <title> element found in the document <head>. The browser tab shows a blank or URL-based label. Google cannot generate a meaningful search snippet for this page.',
    specificFix: 'Add inside <head>: <title>Page Purpose — Brand Name</title>. Lead with the unique page descriptor, append your brand. Keep it 50–60 characters. Example: "Checkout – Acme Shop" not "Acme Shop | Buy Products | Checkout Page".',
    quickWin: true, scoreDeduction: 20,
  }];
};

const checkInputsWithoutLabels: CheckFn = p => {
  if (!p.inputsWithoutLabel.length) return [];
  const shown = p.inputsWithoutLabel.slice(0, 3).map(s => `"${s}"`).join(', ');
  return [{
    id: 'a11y-input-labels', category: 'accessibility', severity: 'high',
    impact: 'High', principle: 'WCAG 1.3.1 – Info and Relationships',
    title: `${p.inputsWithoutLabel.length} form input${p.inputsWithoutLabel.length > 1 ? 's' : ''} lack accessible labels`,
    whyItMatters: 'Screen reader users navigate forms by label. Without a programmatically associated label, they hear only "edit text" with no context of what to type. Placeholder text disappears on typing and is never announced as a label.',
    evidence: `${p.inputsWithoutLabel.length} inputs have no <label for="..."> or aria-label: ${shown}. Each is announced generically by screen readers — users cannot determine what data is expected.`,
    specificFix: 'For each input, add either: (1) <label for="inputId">Field Name</label> with matching id on the input, OR (2) aria-label="Field Name" directly on the input. Never rely on placeholder as a label — it vanishes the moment the user starts typing.',
    quickWin: p.inputsWithoutLabel.length <= 2, scoreDeduction: Math.min(15, 8 + p.inputsWithoutLabel.length * 2),
  }];
};

const checkMissingViewport: CheckFn = p => {
  if (p.hasViewport) return [];
  return [{
    id: 'a11y-viewport', category: 'accessibility', severity: 'high',
    impact: 'High', principle: 'WCAG 1.4.4 – Resize Text / Mobile',
    title: 'Missing viewport meta tag — site cannot render correctly on mobile',
    whyItMatters: 'Without the viewport meta tag, mobile browsers zoom out and render a shrunk desktop layout (~30% scale). Users must pinch-zoom to read anything. Mobile accounts for 60%+ of web traffic — this issue alone can halve your mobile conversion.',
    evidence: 'No <meta name="viewport"> found in <head>. Mobile browsers default to a 980px virtual viewport, then scale the page down, making all text illegible at the natural size.',
    specificFix: 'Add as the first meta in <head>: <meta name="viewport" content="width=device-width, initial-scale=1">. Do NOT add user-scalable=no — that prevents pinch-to-zoom and violates WCAG 1.4.4.',
    quickWin: true, scoreDeduction: 12,
  }];
};

const checkMissingLang: CheckFn = p => {
  if (p.hasLang) return [];
  return [{
    id: 'a11y-lang', category: 'accessibility', severity: 'moderate',
    impact: 'Medium', principle: 'WCAG 3.1.1 – Language of Page',
    title: '<html> element is missing the lang attribute',
    whyItMatters: 'Screen readers select a speech synthesizer profile based on the lang attribute. Without it, the synthesizer may mispronounce words, apply incorrect syllable emphasis, or switch to the wrong language entirely.',
    evidence: 'The <html> element has no lang="..." attribute. Screen readers default to the OS language setting, which may not match your page language.',
    specificFix: 'Change your opening HTML tag to: <html lang="en"> for English. Use IETF language subtags: "fr" for French, "de" for German, "pt-BR" for Brazilian Portuguese.',
    quickWin: true, scoreDeduction: 5,
  }];
};

const checkGenericLinkText: CheckFn = p => {
  if (!p.genericLinks.length) return [];
  const dedup = [...new Set(p.genericLinks)].slice(0, 4).map(t => `"${t}"`).join(', ');
  return [{
    id: 'a11y-generic-links', category: 'accessibility', severity: 'moderate',
    impact: 'Medium', principle: 'WCAG 2.4.6 – Link Purpose',
    title: `${p.genericLinks.length} links use non-descriptive text ("click here", "read more")`,
    whyItMatters: 'Screen reader users navigate pages by tabbing through links. Hearing "click here" 8 times tells them nothing. Descriptive link text also benefits sighted keyboard users and helps SEO by signaling destination context.',
    evidence: `Detected ${p.genericLinks.length} links with generic text: ${dedup}. These links cannot be understood in isolation — which is exactly how screen reader users consume them.`,
    specificFix: 'Replace generic text with specific destination or action: "Click here" → "Download the Q4 UX Audit PDF". "Read more" → "Read the full guide on accessibility". When the visible label must stay short, add aria-label="[full description]" to the <a> element.',
    quickWin: true, scoreDeduction: Math.min(8, 3 + p.genericLinks.length),
  }];
};

const checkIframesWithoutTitle: CheckFn = p => {
  if (!p.iframesWithoutTitle) return [];
  return [{
    id: 'a11y-iframe-title', category: 'accessibility', severity: 'moderate',
    impact: 'Medium', principle: 'WCAG 4.1.2 – Name, Role, Value',
    title: `${p.iframesWithoutTitle} iframe${p.iframesWithoutTitle > 1 ? 's' : ''} missing title attribute`,
    whyItMatters: 'Screen readers announce iframes by their title. Without one, users hear "frame" with no context — they cannot determine if it\'s a payment form, a video, or an advertisement. Common untitled iframes: YouTube embeds, chat widgets, Google Maps.',
    evidence: `${p.iframesWithoutTitle} <iframe> element(s) have no title attribute. Assistive technologies cannot communicate what these embedded regions contain.`,
    specificFix: 'Add a descriptive title to every iframe: <iframe title="YouTube video: Product Demo" ...> or <iframe title="Intercom chat widget" ...>. For decorative iframes, still add title="" with aria-hidden="true".',
    quickWin: true, scoreDeduction: 5,
  }];
};

const checkSkipLink: CheckFn = p => {
  if (p.hasSkipLink || p.navItems.length < 3) return [];
  return [{
    id: 'a11y-skip-link', category: 'accessibility', severity: 'low',
    impact: 'Low', principle: 'WCAG 2.4.1 – Bypass Blocks',
    title: 'No "Skip to main content" link provided',
    whyItMatters: 'Keyboard-only users must Tab through every navigation item on every page load before reaching content. A skip link lets them bypass the nav in one keystroke — a significant usability improvement for motor-impaired users.',
    evidence: `No skip navigation link detected. With ${p.navItems.length} navigation items, keyboard users press Tab ${p.navItems.length}+ times to reach the first paragraph of content.`,
    specificFix: 'Add as the very first child of <body>: <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:p-3">Skip to main content</a>. Add id="main" to your <main> element. Use Tailwind\'s sr-only class or an equivalent visually-hidden CSS rule.',
    quickWin: true, scoreDeduction: 3,
  }];
};

const checkExternalLinksNoopener: CheckFn = p => {
  if (p.externalLinksWithoutNoopener < 2) return [];
  return [{
    id: 'a11y-noopener', category: 'accessibility', severity: 'low',
    impact: 'Low', principle: 'Security & Privacy — Window Opener Vulnerability',
    title: `${p.externalLinksWithoutNoopener} external links open new tabs without rel="noopener noreferrer"`,
    whyItMatters: 'Without rel="noopener", a new tab opened by your link can access window.opener — allowing the external page to redirect your original page to a phishing URL. This is a well-documented reverse tabnapping attack vector.',
    evidence: `${p.externalLinksWithoutNoopener} <a target="_blank"> links pointing to external domains are missing rel="noopener noreferrer". These pages can access your window context.`,
    specificFix: 'Add rel="noopener noreferrer" to every external link: <a href="https://..." target="_blank" rel="noopener noreferrer">. In React/Next.js, this is the required pattern for external Link components.',
    quickWin: true, scoreDeduction: 3,
  }];
};

// ══ USABILITY ══════════════════════════════════════════════════════════════════

const checkMissingMetaDescription: CheckFn = p => {
  if (p.metaDescription) return [];
  return [{
    id: 'usability-meta-desc', category: 'usability', severity: 'high',
    impact: 'High', principle: 'Nielsen #1 – Visibility of System Status',
    title: 'Missing meta description',
    whyItMatters: 'The meta description is your organic search ad copy. Without it, Google auto-generates a snippet from arbitrary body text — often pulling from a footer, nav, or unrelated paragraph. Pages with crafted descriptions consistently see 5.8% higher CTR.',
    evidence: `No <meta name="description"> found in <head>.${p.ogDescription ? ` Your og:description ("${p.ogDescription.substring(0, 60)}...") exists but is not used as the page meta description.` : ' Google will auto-generate an unreliable snippet.'}`,
    specificFix: 'Write a 130–155 character description that opens with the primary value: <meta name="description" content="[Primary benefit] for [target audience]. [Secondary differentiator]. [Soft CTA].">. Match it to the page\'s H1 intent, not a generic brand description.',
    quickWin: true, scoreDeduction: 10,
  }];
};

const checkMissingOgTags: CheckFn = p => {
  const missingOgTitle = !p.ogTitle && !p.title;
  const missingOgDesc  = !p.ogDescription && !p.metaDescription;
  if (!missingOgTitle && !missingOgDesc && p.ogImage) return [];
  const missing = [
    !p.ogTitle ? 'og:title' : null,
    !p.ogDescription ? 'og:description' : null,
    !p.ogImage ? 'og:image' : null,
  ].filter(Boolean);
  if (!missing.length) return [];
  return [{
    id: 'usability-og-tags', category: 'usability', severity: 'moderate',
    impact: 'Medium', principle: 'Nielsen #6 – Recognition over Recall',
    title: `Open Graph tags missing: ${missing.join(', ')}`,
    whyItMatters: 'Open Graph tags control how your page appears when shared on Slack, Twitter, LinkedIn, Facebook, and iMessage. Without them, shared links show a blank thumbnail with raw URL text — dramatically reducing click-through from social and chat.',
    evidence: `Missing Open Graph properties: ${missing.map(m => `<meta property="${m}">`).join(', ')}. Sharing this URL in Slack or LinkedIn will produce a bare link preview with no image or description.`,
    specificFix: `Add to <head>: <meta property="og:title" content="${p.title || 'Page Title'}"> <meta property="og:description" content="${p.metaDescription || 'Page description'}"> <meta property="og:image" content="https://yourdomain.com/og-image.jpg"> (og:image should be 1200×630px).`,
    quickWin: true, scoreDeduction: 6,
  }];
};

const checkTitleLength: CheckFn = p => {
  if (!p.title) return [];
  if (p.title.length >= 30 && p.title.length <= 60) return [];
  const long = p.title.length > 60;
  return [{
    id: long ? 'usability-title-long' : 'usability-title-short',
    category: 'usability', severity: 'moderate', impact: 'Medium',
    principle: 'Nielsen #6 – Recognition over Recall',
    title: long
      ? `Page title is too long (${p.title.length} chars, limit ~60)`
      : `Page title is too short (${p.title.length} chars)`,
    whyItMatters: long
      ? 'Google truncates titles beyond ~60 characters in SERPs, cutting off your brand or key differentiator. Users see "…" mid-sentence.'
      : 'Very short titles miss opportunities to signal page purpose and target keywords in search results and browser tabs.',
    evidence: long
      ? `Title: "${p.title.substring(0, 80)}${p.title.length > 80 ? '…' : ''}". At ${p.title.length} characters, Google will truncate after ~60, likely dropping the brand name or action phrase.`
      : `Title: "${p.title}". At only ${p.title.length} characters, this communicates minimal context in search results or browser history.`,
    specificFix: long
      ? 'Trim to 50–60 characters. Lead with the unique page-level keyword, then append " – Brand". Cut words like "official", "welcome to", "the ultimate guide to".'
      : 'Expand to 40–60 characters: "[Page purpose] – [Brand]". E.g. "UX Audit Dashboard – AcmeTool" rather than just "Dashboard".',
    quickWin: true, scoreDeduction: 5,
  }];
};

const checkNoSearch: CheckFn = p => {
  if (p.hasSearch || p.wordCount < 400) return [];
  return [{
    id: 'usability-no-search', category: 'usability', severity: 'moderate',
    impact: 'Medium', principle: 'Nielsen #7 – Flexibility and Efficiency of Use',
    title: 'No search functionality detected on a content-rich page',
    whyItMatters: '43% of website visitors navigate directly to the search bar upon arrival. On content-rich pages, visitors who can\'t find what they need via search bounce rather than browsing. Sites with prominent search see 1.8× higher conversion among search users.',
    evidence: `No <input type="search">, search landmark, or search-labeled element found on a page with ${p.wordCount.toLocaleString()} words of content. Goal-directed users have no efficient navigation path.`,
    specificFix: 'Add a search input in the header: <input type="search" placeholder="Search..." aria-label="Site search">. Wire it to a filtered page or site search. Even basic client-side filtering of content sections provides significant UX value.',
    quickWin: false, scoreDeduction: 5,
  }];
};

const checkGenericButtonText: CheckFn = p => {
  const WEAK = new Set(['submit', 'click here', 'go', 'ok', 'yes', 'no', 'button', 'send', 'enter']);
  const bad  = p.buttons.filter(b => WEAK.has(b.toLowerCase().trim()));
  if (!bad.length) return [];
  const shown = bad.slice(0, 3).map(b => `"${b}"`).join(', ');
  return [{
    id: 'usability-generic-buttons', category: 'usability', severity: 'high',
    impact: 'High', principle: 'Nielsen #6 – Recognition over Recall',
    title: `${bad.length} button${bad.length > 1 ? 's' : ''} use vague action text (${shown})`,
    whyItMatters: '"Submit" focuses on the user\'s effort. "Send Message" confirms the outcome. Outcome-oriented button labels reduce hesitation and increase form completions by 20–30% on average. Users are more willing to act when they know the result.',
    evidence: `Buttons labeled: ${shown}. These labels give users zero confidence about what happens after clicking — a primary source of form abandonment at the final step.`,
    specificFix: 'Use the formula: [Verb] + [My/Your] + [Value Outcome]. "Submit" → "Send My Request". "Go" → "Find Flights". "Send" → "Send Message". First-person ("Get My Report") outperforms second-person ("Get Your Report") by 90% in A/B tests.',
    quickWin: true, scoreDeduction: Math.min(12, 8 + bad.length * 2),
  }];
};

const checkMissingCanonical: CheckFn = p => {
  if (p.hasCanonical) return [];
  return [{
    id: 'usability-canonical', category: 'usability', severity: 'low',
    impact: 'Low', principle: 'SEO & Discoverability',
    title: 'No canonical link tag found',
    whyItMatters: 'Without a canonical tag, search engines must guess the authoritative URL when the same content is accessible at multiple paths (www vs non-www, http vs https, trailing slash variants). This splits PageRank across duplicate URLs.',
    evidence: 'No <link rel="canonical"> found in <head>. If this page is accessible at multiple URLs, search engines will independently index each version, diluting ranking signals.',
    specificFix: 'Add to <head>: <link rel="canonical" href="https://yourdomain.com/this-page/">. Always use the https, www-consistent, trailing-slash-consistent version. In Next.js, use <link rel="canonical"> in your metadata or the new metadata API.',
    quickWin: true, scoreDeduction: 3,
  }];
};

const checkMissingFavicon: CheckFn = p => {
  if (p.hasFavicon) return [];
  return [{
    id: 'usability-favicon', category: 'usability', severity: 'low',
    impact: 'Low', principle: 'Nielsen #4 – Consistency and Standards',
    title: 'No favicon defined',
    whyItMatters: 'The favicon appears in browser tabs, bookmarks, browser history, and mobile home screen shortcuts. Its absence makes your site look unpolished and harder to identify when users have 20 open tabs.',
    evidence: 'No <link rel="icon"> or <link rel="shortcut icon"> found in <head>. Browsers will display a generic blank-page icon for your site.',
    specificFix: 'Add to <head>: <link rel="icon" href="/favicon.ico">. Also provide modern formats: <link rel="icon" type="image/svg+xml" href="/icon.svg"> and <link rel="apple-touch-icon" href="/apple-icon.png"> (180×180px). Use realfavicongenerator.net to generate all needed sizes.',
    quickWin: true, scoreDeduction: 2,
  }];
};

const checkNoBreadcrumbs: CheckFn = p => {
  if (p.hasBreadcrumbs || p.navItems.length < 3) return [];
  return [{
    id: 'usability-breadcrumbs', category: 'usability', severity: 'low',
    impact: 'Low', principle: 'Nielsen #6 – Recognition over Recall',
    title: 'No breadcrumb navigation found',
    whyItMatters: 'Breadcrumbs show users their exact location in the site hierarchy and provide one-click parent navigation. They reduce back-button dependency and are especially critical for users who arrive from search engines deep in your content tree.',
    evidence: 'No breadcrumb nav pattern (HTML5 nav with aria-label="breadcrumb" or breadcrumb class) detected. Users who land on this page from search cannot easily navigate to parent sections.',
    specificFix: 'Add above the page heading: <nav aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/category">Category</a></li><li aria-current="page">Current Page</li></ol></nav>. Add BreadcrumbList JSON-LD schema for bonus rich results in Google.',
    quickWin: false, scoreDeduction: 3,
  }];
};

// ══ VISUAL HIERARCHY ══════════════════════════════════════════════════════════

const checkMissingH1: CheckFn = p => {
  if (p.h1Tags.length) return [];
  return [{
    id: 'visual-missing-h1', category: 'visual', severity: 'critical',
    impact: 'High', principle: 'Visual Hierarchy — Primary Landmark',
    title: 'Page has no H1 heading',
    whyItMatters: 'The H1 is the single most important on-page SEO signal and the primary accessibility landmark for screen readers. Its absence means Google has no clear topic signal, and screen reader users cannot identify the page\'s core purpose.',
    evidence: `Zero <h1> elements detected. The page has ${p.headings.length} total heading${p.headings.length !== 1 ? 's' : ''} at other levels, but none at H1. Google will substitute whatever text it deems most prominent — often navigation or footer items.`,
    specificFix: 'Add one <h1> that clearly states the page\'s primary purpose. It should be the first visible heading, should reflect the user\'s search intent, and should closely match the <title> content. Keep it under 70 characters. Never hide it off-screen or use an image instead of text.',
    quickWin: true, scoreDeduction: 15,
  }];
};

const checkMultipleH1s: CheckFn = p => {
  if (p.h1Tags.length <= 1) return [];
  const shown = p.h1Tags.slice(0, 3).map(h => `"${h}"`).join(', ');
  return [{
    id: 'visual-multiple-h1', category: 'visual', severity: 'high',
    impact: 'High', principle: 'Visual Hierarchy — Single Dominant Entry Point',
    title: `${p.h1Tags.length} H1 headings found — only one should exist per page`,
    whyItMatters: 'Multiple H1s split the page\'s topical focus signal across competing statements. Search engines and screen reader document outlines expect one dominant topic per page. It\'s equivalent to a newspaper having three headlines all claiming to be the lead story.',
    evidence: `Found ${p.h1Tags.length} H1 elements: ${shown}. Each competes for attention and authority, making it unclear which defines the page\'s actual topic.`,
    specificFix: `Keep only the most important H1 — the one that defines the page\'s primary purpose. Demote the others: section headers → H2, sub-section headers → H3. The correct hierarchy: H1 (once) → H2 (major sections) → H3 (subsections).`,
    quickWin: true, scoreDeduction: 10,
  }];
};

const checkHeadingHierarchy: CheckFn = p => {
  if (p.headings.length < 2) return [];
  const skips: string[] = [];
  for (let i = 1; i < p.headings.length; i++) {
    const prev = p.headings[i - 1].level, curr = p.headings[i].level;
    if (curr > prev + 1) skips.push(`H${prev}→H${curr}`);
  }
  if (!skips.length) return [];
  return [{
    id: 'visual-heading-hierarchy', category: 'visual', severity: 'moderate',
    impact: 'Medium', principle: 'Visual Hierarchy — Logical Document Outline',
    title: `Heading hierarchy skips levels (${skips.slice(0, 2).join(', ')})`,
    whyItMatters: 'Screen readers build a navigable page outline from headings. Skipping levels (H1→H3) breaks the outline\'s logical flow, making navigation unpredictable. It also weakens semantic structure for search engines expecting a well-formed content hierarchy.',
    evidence: `${skips.length} level skip(s) detected: ${skips.slice(0, 3).join('; ')}. Users navigating by headings encounter a disjointed content tree.`,
    specificFix: 'Headings must descend in steps: H1→H2→H3→H4. Never jump levels for visual sizing — use CSS instead. If you need a smaller heading visually, apply font-size via CSS to the correct semantic heading level. The heading level communicates structure, not appearance.',
    quickWin: false, scoreDeduction: 7,
  }];
};

const checkNoSemanticStructure: CheckFn = p => {
  if (p.sectionCount > 0) return [];
  return [{
    id: 'visual-no-structure', category: 'visual', severity: 'moderate',
    impact: 'Medium', principle: 'Visual Hierarchy — Structured Document Layout',
    title: 'No semantic structure elements (<main>, <section>, <article>)',
    whyItMatters: 'Semantic HTML landmarks communicate page regions to assistive technologies and search engines. Without them, all content is one undifferentiated block. Screen reader users cannot jump between page regions; Google cannot identify content boundaries.',
    evidence: 'No <main>, <section>, or <article> elements found. All content appears nested in non-semantic <div> elements, which carry no structural meaning for browsers, assistive tech, or crawlers.',
    specificFix: 'Wrap content regions: <main> for primary content (one per page), <section> for thematically grouped content, <article> for self-contained items (blog posts, product cards), <aside> for supplementary content. Add aria-label to landmark regions when there are multiples of the same type.',
    quickWin: true, scoreDeduction: 6,
  }];
};

const checkNoLists: CheckFn = p => {
  if (p.listCount > 0 || p.wordCount < 300) return [];
  return [{
    id: 'visual-no-lists', category: 'visual', severity: 'low',
    impact: 'Low', principle: 'Visual Hierarchy — Scannable Content',
    title: 'No list elements used on a text-heavy page',
    whyItMatters: 'Users scan before they read. Bullet lists and numbered lists increase scanability, reduce reading time by ~40%, and make parallel content immediately comparable. Prose-only pages see higher bounce rates as users struggle to extract key points.',
    evidence: `${p.wordCount.toLocaleString()} words with zero <ul> or <ol> elements. Feature benefits, step-by-step processes, and comparison items are likely buried in prose paragraphs.`,
    specificFix: 'Identify any group of 3+ related items and convert them to <ul> or <ol>. Step-by-step instructions → <ol>. Feature lists → <ul>. Comparison attributes → <dl> (definition list). Use <li> text that starts with a strong action verb for maximum impact.',
    quickWin: true, scoreDeduction: 4,
  }];
};

// ══ COGNITIVE LOAD ════════════════════════════════════════════════════════════

const checkNavOverload: CheckFn = p => {
  if (p.navItems.length <= 7) return [];
  const shown = p.navItems.slice(0, 5).map(i => `"${i}"`).join(', ');
  return [{
    id: 'cognitive-nav-overload', category: 'cognitive', severity: 'high',
    impact: 'High', principle: 'Miller\'s Law — Working Memory (7±2)',
    title: `Navigation has ${p.navItems.length} items — exceeds Miller's Law (7±2)`,
    whyItMatters: 'Working memory holds 7±2 chunks at once. Navigation menus beyond 7 items cause decision paralysis, not exploration. Counterintuitively, reducing navigation options increases engagement with the remaining destinations.',
    evidence: `Primary navigation contains ${p.navItems.length} items: ${shown}... Users must evaluate ${p.navItems.length} options simultaneously before making a single click decision.`,
    specificFix: `Reduce to 5–7 top-level items by grouping: combine related pages under a dropdown (e.g., "Solutions" instead of listing each product separately), move low-priority items to the footer, and consolidate "Blog", "News", and "Press" into "Resources". Your target: ${p.navItems.length - 7} items removed.`,
    quickWin: false, scoreDeduction: 8,
  }];
};

const checkTooManyCTAs: CheckFn = p => {
  if (p.ctaButtons.length <= 2) return [];
  const shown = p.ctaButtons.slice(0, 4).map(t => `"${t}"`).join(', ');
  return [{
    id: 'cognitive-cta-overload', category: 'cognitive', severity: 'moderate',
    impact: 'High', principle: 'Hick\'s Law — Decision Time Grows with Choices',
    title: `${p.ctaButtons.length} competing CTAs create decision paralysis`,
    whyItMatters: 'Hick\'s Law states that decision time increases logarithmically with the number of choices. Pages with a single primary CTA outconvert multi-CTA pages by 87%. Every additional CTA dilutes the conversion intent of the others.',
    evidence: `Detected ${p.ctaButtons.length} action buttons: ${shown}. Each competes for the user\'s single click of intent. When everything is emphasized, nothing is.`,
    specificFix: 'Designate one primary CTA (the action most directly leading to your business goal). Give it maximum visual weight: high-contrast color, large size, generous whitespace. All other actions become ghost buttons or text links — visually subordinate but still present for non-primary intent.',
    quickWin: false, scoreDeduction: 7,
  }];
};

const checkHighCognitiveLoad: CheckFn = p => {
  const ratio = p.headings.length > 0 ? p.wordCount / p.headings.length : p.wordCount;
  if (p.wordCount < 1000 || ratio < 250) return [];
  return [{
    id: 'cognitive-content-density', category: 'cognitive', severity: 'moderate',
    impact: 'Medium', principle: 'Cognitive Load Theory — Chunk for Working Memory',
    title: `${p.wordCount.toLocaleString()} words with only ${p.headings.length} heading${p.headings.length !== 1 ? 's' : ''} — content is too dense to scan`,
    whyItMatters: 'Users spend an average of 5.59 seconds scanning above-the-fold content before deciding to scroll. Long, unbroken text blocks cause cognitive overload. The F-pattern eye-tracking study shows readers barely reach line ends in dense paragraphs.',
    evidence: `Approximately 1 heading per ${Math.round(ratio)} words (best practice: 1 per 150–200 words). This page\'s content density requires reading rather than scanning, causing many users to bounce before finding what they need.`,
    specificFix: 'Add a subheading every 150–200 words. Break paragraphs over 3 sentences. Convert lists of items into bullet points. Bold key phrases so F-pattern readers catch key concepts in a scan. For pages over 1,000 words, add a table of contents at the top.',
    quickWin: false, scoreDeduction: 7,
  }];
};

const checkLongForms: CheckFn = p => {
  if (p.formFields <= 6) return [];
  return [{
    id: 'cognitive-long-form', category: 'cognitive', severity: 'high',
    impact: 'High', principle: 'Cognitive Load Theory — Minimal Form Friction',
    title: `Form has ${p.formFields} fields — well above the abandonment threshold`,
    whyItMatters: 'Conversion drops exponentially with form length. HubSpot research shows reducing fields from 11 to 4 can increase conversions by 120%. Each extra field signals effort and raises user hesitation, especially on mobile.',
    evidence: `Detected a form with ${p.formFields} input fields. Industry research shows the optimal form length for initial sign-up or lead capture is 3–5 fields. Every field beyond that costs 3–5% in completion rate.`,
    specificFix: `Audit each of the ${p.formFields} fields: "Is this required for the first interaction?". Move non-essential fields (job title, phone, company size) to a post-signup onboarding flow. Combine name fields: "Full Name" instead of separate First + Last. Consider multi-step forms for required longer flows.`,
    quickWin: false, scoreDeduction: 8,
  }];
};

const checkAutoplayMedia: CheckFn = p => {
  if (!p.hasAutoplayMedia) return [];
  return [{
    id: 'cognitive-autoplay', category: 'cognitive', severity: 'moderate',
    impact: 'Medium', principle: 'WCAG 1.4.2 – Audio Control',
    title: 'Autoplay video or audio detected',
    whyItMatters: 'Autoplaying media startles users and creates an immediate urge to close the tab. It\'s especially disruptive for screen reader users whose audio stream gets overridden. WCAG 1.4.2 prohibits auto-playing audio lasting more than 3 seconds without a pause control.',
    evidence: 'A <video> or <audio> element with the autoplay attribute was detected. This media starts playing without user consent, competing with screen readers and causing surprise across all users.',
    specificFix: 'Remove the autoplay attribute. If autoplay is essential for design (e.g., silent background video), add: autoplay muted playsinline loop — never autoplay with audio. Always include a visible pause/stop button that is the first focusable element near the media.',
    quickWin: true, scoreDeduction: 6,
  }];
};

// ══ CONVERSION ════════════════════════════════════════════════════════════════

const checkNoPrimaryCTA: CheckFn = p => {
  if (p.ctaButtons.length > 0 || p.buttons.length > 0) return [];
  return [{
    id: 'conversion-no-cta', category: 'conversion', severity: 'critical',
    impact: 'High', principle: 'Conversion Optimization — Single Conversion Goal',
    title: 'No call-to-action detected on this page',
    whyItMatters: 'Every page needs one primary action guiding the user\'s next step. Without a CTA, intent-driven visitors — the highest-value segment — have nowhere to go. They bounce and rarely return. A missing CTA is the single fastest way to destroy conversion.',
    evidence: 'No action-oriented button, link, or form submission element found. Users who are ready to engage have no mechanism to do so. This page has no conversion path.',
    specificFix: 'Add one prominent above-the-fold CTA: use action language that communicates value ("Start Free Trial", "Get My Free Audit", "Book a 15-min Demo"). Use a high-contrast color. Position it where the user\'s eye naturally lands in the hero section. Repeat it at the bottom of each content section.',
    quickWin: true, scoreDeduction: 20,
  }];
};

const checkGenericCtaText: CheckFn = p => {
  const WEAK = new Set(['submit', 'click here', 'go', 'send', 'enter', 'continue', 'next', 'ok']);
  const weak = p.ctaButtons.filter(b => WEAK.has(b.toLowerCase().trim()));
  if (!weak.length) return [];
  const shown = weak.slice(0, 2).map(t => `"${t}"`).join(', ');
  return [{
    id: 'conversion-weak-cta', category: 'conversion', severity: 'high',
    impact: 'High', principle: 'Conversion Optimization — Value-Driven Microcopy',
    title: `Primary CTA uses low-converting text (${shown})`,
    whyItMatters: 'CTA text is the most-tested copy on any page. Generic verbs like "Submit" frame the interaction as an obligation. Value verbs like "Get My Report" frame it as a benefit. Outcome-oriented CTAs consistently outperform generic ones by 15–30% in controlled tests.',
    evidence: `CTA button(s) labeled: ${shown}. These focus on what the user must do rather than what they receive — a proven conversion killer at the final decision point.`,
    specificFix: 'Rewrite with the formula: [Action Verb] + [My/Your] + [Value]. "Submit" → "Send My Application". "Continue" → "See My Results". "Go" → "Find Matching Jobs". Test first-person ("Get My") vs second-person ("Get Your") — first-person typically converts 90% higher.',
    quickWin: true, scoreDeduction: 10,
  }];
};

const checkNoSocialProof: CheckFn = p => {
  if (p.hasSocialProof) return [];
  return [{
    id: 'conversion-no-social-proof', category: 'conversion', severity: 'high',
    impact: 'High', principle: 'Conversion Optimization — Social Validation',
    title: 'No social proof detected (testimonials, reviews, ratings, client logos)',
    whyItMatters: '92% of consumers read reviews before purchasing. 88% trust online reviews as much as personal recommendations. Social proof is the single most powerful conversion accelerator available at zero cost — yet many pages omit it entirely.',
    evidence: 'No testimonials, star ratings, review counts, case study references, or customer logo strips found. Visitors must evaluate your claims without third-party validation, creating significant hesitation at every decision point.',
    specificFix: 'Add a minimum viable social proof stack: (1) 2–3 testimonials with photo, full name, role, and company — specifics make them credible. (2) A logo strip of recognizable clients. (3) A stat: "Trusted by 2,400+ teams" or "4.9/5 on G2". Place it directly below your hero CTA to intercept the first objection.',
    quickWin: false, scoreDeduction: 10,
  }];
};

const checkWeakValueProposition: CheckFn = p => {
  const genericH1Patterns = /^(welcome|home|hello|coming soon|index|untitled|page|main)/i;
  const hasGenericH1 = p.h1Tags.some(h => genericH1Patterns.test(h.trim()));
  if (!hasGenericH1 || p.h1Tags.length === 0) return [];
  const offender = p.h1Tags.find(h => genericH1Patterns.test(h.trim())) ?? p.h1Tags[0];
  return [{
    id: 'conversion-weak-value-prop', category: 'conversion', severity: 'high',
    impact: 'High', principle: 'Conversion Optimization — Value Proposition Clarity',
    title: `Hero H1 ("${offender}") doesn't communicate a value proposition`,
    whyItMatters: 'You have ~3 seconds to convince a new visitor they\'re in the right place. Generic H1 text like "Welcome" or "Home" wastes that window. A strong value proposition tells visitors what you do, who it\'s for, and why it matters — all in one scannable headline.',
    evidence: `The page H1 is "${offender}" — this describes nothing about the product, the user benefit, or the audience. Visitors who arrive from search or referral cannot immediately confirm they\'re in the right place.`,
    specificFix: 'Rewrite the H1 using the formula: [Outcome] + [for] + [Audience] + [Time/Ease qualifier]. Example: "Ship UX audits in 60 seconds — without a single consultant" instead of "Welcome". Pair with a supporting subheading that elaborates the mechanism.',
    quickWin: true, scoreDeduction: 12,
  }];
};

// ══ TRUST ═════════════════════════════════════════════════════════════════════

const checkNotHttps: CheckFn = p => {
  if (p.isHttps) return [];
  return [{
    id: 'trust-no-https', category: 'trust', severity: 'critical',
    impact: 'High', principle: 'Trust & Security — Encrypted Connection',
    title: 'Site is served over HTTP — connection is not encrypted',
    whyItMatters: 'Chrome, Safari, and Firefox display a prominent "Not Secure" warning for HTTP sites. 84% of users abandon a purchase if data is sent insecurely. Google penalizes HTTP in rankings. Any form data, cookies, and session tokens are transmitted in plain text, interceptable on any shared network.',
    evidence: `URL begins with "http://" — unencrypted. Users on public WiFi (coffee shops, airports, hotels) have their data exposed to anyone packet-sniffing the network. Google Search Console treats HTTP as a quality signal deficiency.`,
    specificFix: 'Obtain a free SSL/TLS certificate via Let\'s Encrypt (certbot --webroot or Cloudflare\'s free proxy). Configure your server to: (1) redirect all HTTP to HTTPS with 301, (2) set HSTS header: Strict-Transport-Security: max-age=31536000; includeSubDomains. On Vercel, Netlify, or Cloudflare, HTTPS is automatic.',
    quickWin: false, scoreDeduction: 25,
  }];
};

const checkNoPrivacyPolicy: CheckFn = p => {
  if (p.hasPrivacyPolicy) return [];
  return [{
    id: 'trust-no-privacy', category: 'trust', severity: 'high',
    impact: 'High', principle: 'Trust & Legal Compliance',
    title: 'No privacy policy link found',
    whyItMatters: 'A privacy policy is legally required under GDPR (EU), CCPA (California), PIPEDA (Canada), and LGPD (Brazil) whenever you collect any personal data — including IP addresses via analytics, cookies, or contact forms. GDPR fines reach €20M or 4% of global revenue.',
    evidence: 'No link to a privacy policy page detected anywhere in the document. If this site uses Google Analytics, Meta Pixel, cookies, or any contact form, it is likely non-compliant with multiple privacy regulations.',
    specificFix: 'Create a privacy policy (use Iubenda, Termly, or Generator.law for compliant templates). Link it in the footer on every page. If using tracking cookies, implement a GDPR-compliant consent banner (Cookiebot, Osano, or Axeptio) that blocks non-essential cookies until consent is given.',
    quickWin: false, scoreDeduction: 10,
  }];
};

const checkNoContactInfo: CheckFn = p => {
  if (p.hasContactInfo) return [];
  return [{
    id: 'trust-no-contact', category: 'trust', severity: 'high',
    impact: 'High', principle: 'Trust & Credibility — Real Business Signals',
    title: 'No contact information found',
    whyItMatters: 'Absence of contact information is the #2 reason users distrust a website (after design quality). Legitimate businesses are reachable. Anonymous sites pattern-match to scams in users\' minds, even when they aren\'t. Pre-sale questions that go unanswered = lost sales.',
    evidence: 'No email address, phone number, physical address, or link to a contact page detected in the document. Users with purchase hesitation or questions have no path to resolution.',
    specificFix: 'Add at minimum an email or contact form link in the header or footer. Ideally add: email, physical address (city/country is sufficient), and a phone number in the footer. Create a /contact page. For high-intent pages, consider a live chat widget (Intercom, Crisp, or HubSpot free tier).',
    quickWin: true, scoreDeduction: 8,
  }];
};

const checkNoCopyright: CheckFn = p => {
  if (p.hasCopyright) return [];
  return [{
    id: 'trust-no-copyright', category: 'trust', severity: 'low',
    impact: 'Low', principle: 'Trust & Credibility — Legitimate Business Signals',
    title: 'No copyright notice found in footer',
    whyItMatters: 'A copyright notice signals an active, maintained business. Its absence makes a site feel unfinished or abandoned — a subtle but real trust signal. It also provides basic IP protection for your content.',
    evidence: 'No © symbol or "copyright" text found in the document. Footer lacks the standard legitimacy signals that users unconsciously scan for when evaluating site credibility.',
    specificFix: 'Add to your footer: © 2025 Company Name. All rights reserved. Use the current year (not a static past year — that signals neglect). In frameworks, use dynamic year: `© ${new Date().getFullYear()} Company Name`.',
    quickWin: true, scoreDeduction: 3,
  }];
};

const checkNoSocialMedia: CheckFn = p => {
  if (p.hasSocialMedia) return [];
  return [{
    id: 'trust-no-social', category: 'trust', severity: 'moderate',
    impact: 'Low', principle: 'Trust & Credibility — Social Validation',
    title: 'No social media links found',
    whyItMatters: 'Social media links give visitors a way to independently verify your organization exists beyond your own website. Follower counts, recent activity, and public reviews on those platforms provide external validation that you control nothing on.',
    evidence: 'No links to Twitter/X, LinkedIn, Facebook, Instagram, YouTube, GitHub, or other platforms found. Skeptical visitors cannot verify your brand\'s public presence or see recent activity.',
    specificFix: 'Add social media profile links to your footer (or header for B2C brands). Only link to platforms where you are active — a dead Twitter account from 2019 hurts more than no link. Prioritize: LinkedIn for B2B, Instagram for consumer products, GitHub for developer tools, YouTube if you have video content.',
    quickWin: true, scoreDeduction: 5,
  }];
};

// ══ BROWSER-SPECIFIC CHECKS (Playwright data) ═════════════════════════════════

const browserCheckColorContrast: BrowserCheckFn = b => {
  const issues = b.colorContrastIssues;
  if (!issues.length) return [];
  const worst = [...issues].sort((a, z) => a.ratio - z.ratio).slice(0, 4);
  const examples = worst.map(i =>
    `"${i.text.substring(0, 35)}" — ${i.ratio}:1 contrast (needs ${i.required}:1, text ${i.textColor} on ${i.bgColor})`
  ).join('; ');
  const hasCritical = issues.some(i => i.ratio < 2.5);
  return [{
    id: 'a11y-color-contrast', category: 'accessibility',
    severity: hasCritical ? 'critical' : 'high',
    impact: 'High', principle: 'WCAG 1.4.3 – Contrast (Minimum)',
    title: `${issues.length} element${issues.length > 1 ? 's fail' : ' fails'} WCAG color contrast requirements`,
    whyItMatters: 'Low contrast affects 300M people with color vision deficiency and every user in suboptimal lighting (bright sunlight, dim screens). WCAG 1.4.3 requires 4.5:1 for body text and 3:1 for large text. Failures are also an accessibility lawsuit risk under ADA and EN 301 549.',
    evidence: `Contrast ratios computed against actual rendered backgrounds (Playwright computed styles): ${examples}.`,
    specificFix: `Use WebAIM Contrast Checker or Figma's built-in contrast plugin to test every text/background pair. For the worst offenders: darken the text color or lighten/darken the background until ratio ≥ 4.5:1. Common fast fix: darken gray text from #999 → #767676 (passes AA at 4.54:1 on white).`,
    quickWin: issues.length <= 3, scoreDeduction: Math.min(18, 8 + issues.length * 2),
  }];
};

const browserCheckTouchTargets: BrowserCheckFn = b => {
  const issues = b.touchTargetIssues;
  if (!issues.length) return [];
  const shown = issues.slice(0, 3).map(i => `"${i.text}" (${i.width}×${i.height}px)`).join(', ');
  return [{
    id: 'a11y-touch-targets', category: 'accessibility', severity: 'moderate',
    impact: 'High', principle: 'WCAG 2.5.5 – Target Size (Enhanced)',
    title: `${issues.length} interactive element${issues.length > 1 ? 's are' : ' is'} smaller than 44×44px touch target`,
    whyItMatters: 'Apple HIG and Google Material both require minimum 44px touch targets. Small targets cause mis-taps, especially on mobile. This is a documented accessibility barrier for users with motor disabilities and a measurable UX issue for everyone on phones.',
    evidence: `Measured via Playwright element bounding rects: ${shown}. These elements are difficult or impossible to tap reliably on a mobile device.`,
    specificFix: 'Increase the clickable area with CSS padding — not just the visual size. For links: padding: 12px. For buttons: min-height: 44px; padding: 10px 16px. Use CSS touch-action: manipulation to eliminate the 300ms delay. Never use display:flex on inline elements that reduces target size.',
    quickWin: false, scoreDeduction: Math.min(10, 4 + issues.length * 1.5),
  }];
};

const browserCheckBodyFontSize: BrowserCheckFn = b => {
  if (b.bodyFontSizePx >= 14) return [];
  return [{
    id: 'a11y-font-size', category: 'accessibility', severity: 'moderate',
    impact: 'Medium', principle: 'WCAG 1.4.4 – Resize Text',
    title: `Body font size is too small (${b.bodyFontSizePx}px computed in browser)`,
    whyItMatters: 'Text below 14px is difficult to read for older users and anyone with reduced visual acuity. WCAG 1.4.4 requires text to be resizable to 200% without loss of content, but small base sizes compound the problem. Google also considers mobile font size in Core Web Vitals.',
    evidence: `Playwright computed body font-size: ${b.bodyFontSizePx}px. Industry best practice is 16px for body copy. At ${b.bodyFontSizePx}px, users with even mild visual impairment will struggle to read paragraph text without zooming.`,
    specificFix: 'Set body { font-size: 16px } as your base. Use relative units (rem/em) for all other type sizes so they scale proportionally with user browser preferences. Never set font-size in px on <html> or <body> if users have custom browser zoom preferences.',
    quickWin: true, scoreDeduction: 6,
  }];
};

const browserCheckCtaNotAboveFold: BrowserCheckFn = b => {
  if (b.ctaAboveFold) return [];
  return [{
    id: 'conversion-cta-below-fold', category: 'conversion', severity: 'high',
    impact: 'High', principle: 'Conversion Optimization — Above-Fold Hierarchy',
    title: 'No CTA button detected above the fold (verified in browser at 1280×800)',
    whyItMatters: 'According to Nielsen Norman Group eye-tracking studies, 80% of user attention is focused above the fold. Users who don\'t see a clear next step immediately are 3× more likely to bounce. Above-fold CTA placement is the single highest-leverage conversion change.',
    evidence: `Playwright measured all button elements at 1280×800 viewport. No button with CTA text (sign up, get started, start, try, etc.) was found within the 800px viewport height. The first action is hidden below the fold, requiring a scroll before users know how to proceed.`,
    specificFix: 'Move your primary CTA into the hero section, visually prominent above the 800px fold line. If your hero has a long headline + subtitle, place the CTA immediately below — no more than 2 sentences from the top of the page. Test: does a new visitor see your CTA without scrolling?',
    quickWin: false, scoreDeduction: 12,
  }];
};

const browserCheckConsoleErrors: BrowserCheckFn = b => {
  if (!b.consoleErrors.length) return [];
  const shown = b.consoleErrors.slice(0, 3).map(e => `"${e.substring(0, 100)}"`).join('; ');
  return [{
    id: 'usability-console-errors', category: 'usability', severity: 'high',
    impact: 'High', principle: 'Nielsen #5 – Error Prevention',
    title: `${b.consoleErrors.length} JavaScript error${b.consoleErrors.length > 1 ? 's' : ''} detected in browser console`,
    whyItMatters: 'Console errors indicate broken JavaScript — which means broken features. Broken forms, non-working CTAs, and failed interactions are invisible to users until the moment of frustration. JS errors also prevent analytics tracking, so you\'re flying blind on what\'s broken.',
    evidence: `Playwright captured these console errors during page load: ${shown}. Each error represents a piece of UI that may be silently failing for your users.`,
    specificFix: 'Open Chrome DevTools → Console and reproduce each error. Most common: undefined variables (check for null before accessing), network failures (add error handling to fetch calls), and CORS errors (configure server headers). Fix the highest-severity errors first — those that affect interactive elements.',
    quickWin: false, scoreDeduction: Math.min(14, 6 + b.consoleErrors.length * 2),
  }];
};

const browserCheckBrokenResources: BrowserCheckFn = b => {
  if (!b.brokenResources.length) return [];
  const shown = b.brokenResources.slice(0, 3).join('; ');
  return [{
    id: 'usability-broken-resources', category: 'usability', severity: 'moderate',
    impact: 'Medium', principle: 'Nielsen #1 – Visibility of System Status',
    title: `${b.brokenResources.length} resource${b.brokenResources.length > 1 ? 's' : ''} failed to load (detected by Playwright network monitoring)`,
    whyItMatters: 'Broken resources mean missing images, broken styles, or failed scripts. Each broken resource can cause layout shifts, missing UI elements, or broken functionality. They also slow down perceived performance as the browser waits for timeouts.',
    evidence: `Network failures captured during page load: ${shown}.`,
    specificFix: 'Check each failed resource URL in DevTools → Network. Common causes: wrong path after a deployment, missing CDN assets, expired S3 presigned URLs, or blocked third-party resources. Fix 404 resources by correcting paths. For third-party failures, add error boundaries and graceful degradation.',
    quickWin: false, scoreDeduction: Math.min(8, 3 + b.brokenResources.length * 2),
  }];
};

const browserCheckSlowRender: BrowserCheckFn = b => {
  if (b.largestContentfulPaintMs < 2500 || b.largestContentfulPaintMs === 0) return [];
  const rating = b.largestContentfulPaintMs < 4000 ? 'Needs Improvement' : 'Poor';
  return [{
    id: 'usability-slow-lcp', category: 'usability', severity: b.largestContentfulPaintMs > 4000 ? 'high' : 'moderate',
    impact: 'High', principle: 'Core Web Vitals – Largest Contentful Paint',
    title: `LCP is ${(b.largestContentfulPaintMs / 1000).toFixed(1)}s — ${rating} (Google threshold: < 2.5s Good)`,
    whyItMatters: 'LCP is Google\'s primary measure of perceived load speed. An LCP > 2.5s directly hurts your Google Search ranking (Core Web Vitals are a confirmed ranking factor). Users also bounce at much higher rates — 53% of mobile visits abandon pages that take > 3s to load.',
    evidence: `Playwright measured LCP: ${b.largestContentfulPaintMs}ms at a 1280×800 viewport over a local connection. In production on slower networks, this will be significantly higher. Google classifies: < 2500ms Good, 2500–4000ms Needs Improvement, > 4000ms Poor.`,
    specificFix: 'LCP is usually the hero image or above-fold heading. Top optimizations: (1) Preload the LCP image: <link rel="preload" as="image" href="hero.jpg">. (2) Use next/image with priority={true} for the hero. (3) Serve images in WebP/AVIF format. (4) Add resource hints: <link rel="preconnect"> for CDN origins.',
    quickWin: false, scoreDeduction: b.largestContentfulPaintMs > 4000 ? 10 : 5,
  }];
};

const BROWSER_CHECKS: BrowserCheckFn[] = [
  browserCheckColorContrast,
  browserCheckTouchTargets,
  browserCheckBodyFontSize,
  browserCheckCtaNotAboveFold,
  browserCheckConsoleErrors,
  browserCheckBrokenResources,
  browserCheckSlowRender,
];

// ══ RUNNER ════════════════════════════════════════════════════════════════════

const CHECKS: Record<CategoryId, CheckFn[]> = {
  accessibility: [
    checkMissingAltText, checkMissingTitle, checkInputsWithoutLabels,
    checkMissingViewport, checkMissingLang, checkGenericLinkText,
    checkIframesWithoutTitle, checkSkipLink, checkExternalLinksNoopener,
  ],
  usability: [
    checkMissingMetaDescription, checkMissingOgTags, checkTitleLength,
    checkNoSearch, checkGenericButtonText, checkMissingCanonical,
    checkMissingFavicon, checkNoBreadcrumbs,
  ],
  visual: [
    checkMissingH1, checkMultipleH1s, checkHeadingHierarchy,
    checkNoSemanticStructure, checkNoLists,
  ],
  cognitive: [
    checkNavOverload, checkTooManyCTAs, checkHighCognitiveLoad,
    checkLongForms, checkAutoplayMedia,
  ],
  conversion: [
    checkNoPrimaryCTA, checkGenericCtaText, checkNoSocialProof, checkWeakValueProposition,
  ],
  trust: [
    checkNotHttps, checkNoPrivacyPolicy, checkNoContactInfo,
    checkNoCopyright, checkNoSocialMedia,
  ],
};

function computeScore(issues: Issue[]): number {
  // Deduct by severity tier with individual caps to avoid a category going to 0
  // just from one type of issue piling up
  const criticalDed = Math.min(40, issues.filter(i => i.severity === 'critical').reduce((s, i) => s + i.scoreDeduction, 0));
  const highDed     = Math.min(30, issues.filter(i => i.severity === 'high').reduce((s, i) => s + i.scoreDeduction, 0));
  const modDed      = Math.min(20, issues.filter(i => i.severity === 'moderate').reduce((s, i) => s + i.scoreDeduction, 0));
  const lowDed      = Math.min(10, issues.filter(i => i.severity === 'low').reduce((s, i) => s + i.scoreDeduction, 0));
  return Math.max(0, 100 - criticalDed - highDed - modDed - lowDed);
}

function grade(score: number): AuditResult['grade'] {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function summary(score: number): string {
  if (score >= 85) return 'This page has a strong UX foundation with only minor improvements needed. Focus on the quick wins to push toward an A grade.';
  if (score >= 70) return 'Solid base, but several high-severity issues are suppressing conversion and accessibility. Addressing those will have immediate user impact.';
  if (score >= 50) return 'Multiple significant UX issues detected across categories. Prioritize critical and high-severity fixes — they account for the largest score recovery.';
  return 'Serious UX deficiencies detected across multiple dimensions. The critical issues require immediate attention to prevent legal risk, lost conversions, and poor user trust.';
}

export function runAnalysis(
  page: ParsedPage,
  browser?: BrowserCapture,
): Omit<AuditResult, 'url' | 'domain' | 'analyzedAt' | 'metadata' | 'screenshotUrl' | 'browser'> {
  const ORDERED: CategoryId[] = ['accessibility', 'usability', 'visual', 'cognitive', 'conversion', 'trust'];

  // HTML-based issues
  const htmlIssuesByCategory = new Map<CategoryId, Issue[]>(
    ORDERED.map(id => [id, CHECKS[id].flatMap(fn => fn(page))])
  );

  // Browser-based issues (Playwright), merged into the correct categories
  const browserIssuesByCategory = new Map<CategoryId, Issue[]>(
    ORDERED.map(id => [id, [] as Issue[]])
  );
  if (browser) {
    for (const fn of BROWSER_CHECKS) {
      for (const issue of fn(browser)) {
        const bucket = browserIssuesByCategory.get(issue.category);
        if (bucket) bucket.push(issue);
      }
    }
  }

  const categories: CategoryResult[] = ORDERED.map(id => {
    const issues = [
      ...(htmlIssuesByCategory.get(id) ?? []),
      ...(browserIssuesByCategory.get(id) ?? []),
    ];
    return {
      id, label: CATEGORY_LABELS[id],
      score: computeScore(issues),
      issues,
      industryBenchmark: CATEGORY_BENCHMARKS[id],
    };
  });

  const allIssues = categories.flatMap(c => c.issues);
  const overallScore = Math.round(
    categories.reduce((s, c) => s + c.score * CATEGORY_WEIGHTS[c.id], 0)
  );
  const quickWins = allIssues
    .filter(i => i.quickWin)
    .sort((a, b) => b.scoreDeduction - a.scoreDeduction)
    .slice(0, 7);

  return { overallScore, grade: grade(overallScore), summary: summary(overallScore), categories, allIssues, quickWins };
}
