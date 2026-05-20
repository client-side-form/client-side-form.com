// main.js — site-wide interactions

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

  // Find headings that indicate an FAQ section (h2 or h3)
  Array.from(article.querySelectorAll('h2, h3')).forEach((heading) => {
    if (!/frequently asked questions|^faq$/i.test(heading.textContent.trim())) return;

    // Wrap everything from the heading until the next same-level heading in a .faq-section
    const wrapper = document.createElement('div');
    wrapper.className = 'faq-section';
    heading.parentNode.insertBefore(wrapper, heading);
    wrapper.appendChild(heading);

    let node = wrapper.nextSibling;
    while (node) {
      const next = node.nextSibling;
      const tag = node.nodeName.toLowerCase();
      // Stop at the next heading of same or higher level
      if (tag === heading.tagName.toLowerCase() || tag === 'h1') break;
      wrapper.appendChild(node);
      node = next;
    }

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

// 4. Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

