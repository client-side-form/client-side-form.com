// main.js — site-wide interactions

// 0. Theme toggle
// The <head> script has already stamped data-theme on <html>, so this only has to
// keep the control's pressed state honest, flip the attribute on click, persist the
// choice, and keep following the OS until the reader makes one.
(function () {
  const root = document.documentElement;
  const btn = document.querySelector('[data-theme-toggle]');
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  const current = () =>
    root.getAttribute('data-theme') || (media && media.matches ? 'dark' : 'light');

  function sync() {
    if (!btn) return;
    const dark = current() === 'dark';
    btn.setAttribute('aria-pressed', String(dark));
    const label = dark ? 'Switch to light theme' : 'Switch to dark theme';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#14101d' : '#1a1a3e');
    sync();
  }

  if (btn) {
    btn.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
    });
  }

  // Keep following the OS preference until the reader has stored an explicit choice.
  if (media && media.addEventListener) {
    media.addEventListener('change', (e) => {
      let stored = null;
      try { stored = localStorage.getItem('theme'); } catch (err) { /* ignore */ }
      if (stored !== 'light' && stored !== 'dark') apply(e.matches ? 'dark' : 'light');
    });
  }

  sync();
})();

// 1. Mobile navigation toggle
(function () {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });

  // Close nav when a link is clicked
  nav.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => nav.classList.remove('open'))
  );
})();

// 2. FAQ Accordion — transform FAQ sections into <details> accordions
//
// Handles three content patterns that appear across pages:
//   Pattern A: <p><strong>Question text?</strong> Answer inline or in next <p></p>
//   Pattern B: <h3>Question text?</h3> followed by <p>Answer</p>
//   Pattern C: <li><strong>Q: Question?</strong> A: Answer (list-item format)
(function () {
  const article = document.querySelector('.article-body');
  if (!article) return;

  // Match the FAQ section heading across authoring variants. markdown-it may append a "#" permalink
  // anchor, so normalise the text (strip leading/trailing #/¶/punctuation) before testing. Mirrors
  // the QA gate's matcher so a section the gate inspects is always one the builder converts.
  const faqHeadText = (h) => (h.textContent || '').replace(/\s+/g, ' ').trim()
    .toLowerCase().replace(/^[\s#¶]+|[\s#¶?:.]+$/g, '');
  const isFaqHead = (t) =>
    /frequently asked questions?|^faqs?$|^common questions$|^q ?& ?a$|^questions?\s+(and|&)\s+answers$/.test(t);

  // Find headings that indicate an FAQ section (h2 or h3)
  Array.from(article.querySelectorAll('h2, h3')).forEach((heading) => {
    if (!isFaqHead(faqHeadText(heading))) return;

    // Wrap everything from the heading until the next same-level heading in a .faq-section
    const wrapper = document.createElement('div');
    wrapper.className = 'faq-section';
    heading.parentNode.insertBefore(wrapper, heading);
    wrapper.appendChild(heading);

    let node = wrapper.nextSibling;
    while (node) {
      const next = node.nextSibling;
      const tag = node.nodeName.toLowerCase();
      // Stop at the next heading of same or higher level...
      if (tag === heading.tagName.toLowerCase() || tag === 'h1') break;
      // ...and at a thematic break (<hr>), which ends the FAQ and precedes the "Related" footer.
      // Without this the footer's <p><strong>Related</strong></p> gets swept into the FAQ region.
      if (tag === 'hr') break;
      wrapper.appendChild(node);
      node = next;
    }

    // ---- Pattern D: pre-existing raw <details> authored server-side ----
    // Some pages already ship <details><summary>Q</summary><p>A</p></details>. They are now inside
    // .faq-section so the CSS styles them, but two things still need normalising:
    //   (a) the summary question must be ONE element so an inline <code>/<em> can't fragment a flex
    //       summary into multiple flex items (the faq-summary-broken regression);
    //   (b) the answer nodes after the summary should live in a .faq-answer wrapper for padding.
    Array.from(wrapper.querySelectorAll('details')).forEach((details) => {
      const summary = details.querySelector(':scope > summary');
      if (summary) {
        // If the summary's question isn't already a single wrapping element, coalesce all of its
        // children into one <span> so it behaves as a single flex item.
        const kids = Array.from(summary.childNodes);
        const onlyChildIsElement = kids.length === 1 && kids[0].nodeType === 1;
        if (!onlyChildIsElement) {
          const span = document.createElement('span');
          while (summary.firstChild) span.appendChild(summary.firstChild);
          summary.appendChild(span);
        }
      }
      // Wrap everything after the summary in .faq-answer (skip if already wrapped).
      if (!details.querySelector(':scope > .faq-answer')) {
        const answerDiv = document.createElement('div');
        answerDiv.className = 'faq-answer';
        let sib = summary ? summary.nextSibling : details.firstChild;
        while (sib) {
          const after = sib.nextSibling;
          answerDiv.appendChild(sib);
          sib = after;
        }
        details.appendChild(answerDiv);
      }
    });

    // ---- Pattern B: <h3> sub-headings inside the FAQ wrapper ----
    Array.from(wrapper.querySelectorAll('h3, h4')).forEach((qHeading) => {
      // Collect answer nodes (siblings until next heading or end of wrapper)
      const answerNodes = [];
      let sib = qHeading.nextSibling;
      while (sib && !/^h[1-4]$/i.test(sib.nodeName)) {
        answerNodes.push(sib);
        sib = sib.nextSibling;
      }

      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = qHeading.textContent.trim().replace(/\?$/, '?');
      details.appendChild(summary);

      const answerDiv = document.createElement('div');
      answerDiv.className = 'faq-answer';
      answerNodes.forEach((n) => answerDiv.appendChild(n));
      details.appendChild(answerDiv);

      wrapper.insertBefore(details, qHeading);
      qHeading.remove();
    });

    // ---- Pattern C: <ul><li><strong>Q: …</strong> A: … list items ----
    Array.from(wrapper.querySelectorAll('li')).forEach((li) => {
      const strong = li.querySelector('strong');
      if (!strong) return;

      // Strip leading "Q:" prefix if present
      let questionText = strong.textContent.trim().replace(/^Q:\s*/i, '');
      if (!questionText) return;

      // Get answer text: everything in the li after the <strong>
      let answerHtml = li.innerHTML
        .replace(strong.outerHTML, '')           // remove the <strong>
        .replace(/^\s*A:\s*/i, '')               // strip leading "A:"
        .trim();

      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = questionText;
      details.appendChild(summary);

      const answerDiv = document.createElement('div');
      answerDiv.className = 'faq-answer';
      const ap = document.createElement('p');
      ap.innerHTML = answerHtml;
      answerDiv.appendChild(ap);
      details.appendChild(answerDiv);

      const parentUl = li.parentElement;
      parentUl.parentNode.insertBefore(details, parentUl);
      li.remove();
      if (parentUl.children.length === 0) parentUl.remove();
    });

    // ---- Pattern A: <p><strong>Question?</strong> Answer text ----
    Array.from(wrapper.querySelectorAll('p')).forEach((p) => {
      const strong = p.querySelector('strong');
      if (!strong) return;

      let questionText = strong.textContent.trim().replace(/^Q:\s*/i, '');
      if (!questionText.endsWith('?')) return;

      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = questionText;
      details.appendChild(summary);

      const answerDiv = document.createElement('div');
      answerDiv.className = 'faq-answer';

      // Remaining text in same <p> after the <strong>
      const inlineAnswer = p.innerHTML
        .replace(strong.outerHTML, '')
        .replace(/^\s*A:\s*/i, '')
        .trim();

      if (inlineAnswer) {
        const ap = document.createElement('p');
        ap.innerHTML = inlineAnswer;
        answerDiv.appendChild(ap);
      }

      // Pull in following <p> siblings that aren't new questions
      let next = p.nextElementSibling;
      while (next && next.tagName === 'P') {
        const nextStrong = next.querySelector('strong');
        if (nextStrong && nextStrong.textContent.trim().endsWith('?')) break;
        const toMove = next;
        next = next.nextElementSibling;
        answerDiv.appendChild(toMove);
      }

      details.appendChild(answerDiv);
      wrapper.insertBefore(details, p);
      p.remove();
    });
  });
})();

// 3. Wrap tables in scroll container
(function () {
  document.querySelectorAll('table').forEach((table) => {
    if (table.parentElement.classList.contains('table-scroll')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'table-scroll';
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
})();

// 4. Scrollable code blocks and wide tables must be keyboard-operable (WCAG 2.1.1).
// Only regions that actually overflow horizontally get a tab stop, so we don't add
// noise for code/tables that fit. Runs on load and on resize (debounced).
(function () {
  function markScrollable() {
    const regions = document.querySelectorAll(
      '.article-body pre, .article-body .table-scroll'
    );
    regions.forEach((el) => {
      const overflows = el.scrollWidth > el.clientWidth + 1;
      if (overflows) {
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
        if (!el.hasAttribute('role')) el.setAttribute('role', 'region');
        if (!el.hasAttribute('aria-label')) {
          el.setAttribute('aria-label', el.matches('.table-scroll') ? 'Table, scrollable' : 'Code, scrollable');
        }
      } else if (el.getAttribute('aria-label') && /scrollable$/.test(el.getAttribute('aria-label'))) {
        // No longer overflowing after a resize — remove the tab stop we added.
        el.removeAttribute('tabindex');
        el.removeAttribute('role');
        el.removeAttribute('aria-label');
      }
    });
  }
  let t = null;
  window.addEventListener('resize', () => {
    if (t) clearTimeout(t);
    t = setTimeout(markScrollable, 150);
  });
  if (document.readyState !== 'loading') markScrollable();
  else document.addEventListener('DOMContentLoaded', markScrollable);
})();

// 5. Diagram figures — download + full-screen controls
//
// Progressive enhancement: every hand-authored diagram is complete without JS. When JS
// runs we wrap it in a <figure> and attach two controls. The download serialises a clone
// with the CURRENTLY COMPUTED fill/stroke baked in, so an exported .svg matches the theme
// the reader is looking at (the live diagram gets its dark colours from CSS variables,
// which would not survive outside the page).
(function () {
  const diagrams = document.querySelectorAll('.article-body svg[role="img"]');
  if (!diagrams.length) return;

  const PAINT = ['fill', 'stroke', 'stop-color', 'color'];

  function inlinePaint(source, clone) {
    const src = source.querySelectorAll('*');
    const dst = clone.querySelectorAll('*');
    for (let i = 0; i < src.length && i < dst.length; i++) {
      const cs = getComputedStyle(src[i]);
      PAINT.forEach((prop) => {
        const v = cs.getPropertyValue(prop);
        if (v && v !== 'none' && !v.startsWith('var(')) dst[i].setAttribute(prop, v.trim());
      });
    }
  }

  function download(svg, name) {
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    inlinePaint(svg, clone);
    // Paint the canvas explicitly — an exported file has no page behind it.
    const bg = getComputedStyle(document.body).backgroundColor;
    const box = (svg.getAttribute('viewBox') || '0 0 100 100').split(/[\s,]+/);
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', box[0]); rect.setAttribute('y', box[1]);
    rect.setAttribute('width', box[2]); rect.setAttribute('height', box[3]);
    rect.setAttribute('fill', bg);
    clone.insertBefore(rect, clone.firstChild);

    const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + clone.outerHTML],
      { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name + '.svg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function slug(text) {
    return (text || 'diagram').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '').slice(0, 60) || 'diagram';
  }

  diagrams.forEach((svg) => {
    if (svg.closest('figure.diagram')) return;
    const titleEl = svg.querySelector('title');
    const name = slug(titleEl ? titleEl.textContent : svg.getAttribute('aria-label'));

    const figure = document.createElement('figure');
    figure.className = 'diagram';
    svg.parentNode.insertBefore(figure, svg);
    figure.appendChild(svg);

    const bar = document.createElement('div');
    bar.className = 'diagram-tools';

    const full = document.createElement('button');
    full.type = 'button';
    full.className = 'diagram-btn';
    full.setAttribute('aria-label', 'View diagram full screen');
    full.textContent = 'Full screen';
    full.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (figure.requestFullscreen) figure.requestFullscreen().catch(() => {});
    });

    const dl = document.createElement('button');
    dl.type = 'button';
    dl.className = 'diagram-btn';
    dl.setAttribute('aria-label', 'Download diagram as SVG');
    dl.textContent = 'Download SVG';
    dl.addEventListener('click', () => download(svg, name));

    bar.appendChild(full);
    bar.appendChild(dl);
    figure.appendChild(bar);
  });
})();

// 6. Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

