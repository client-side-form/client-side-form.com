// Copy-code button + language label injection
(function () {
  // Map Prism language class names to display labels
  const LANG_LABELS = {
    javascript: 'JavaScript', js: 'JavaScript',
    typescript: 'TypeScript', ts: 'TypeScript',
    jsx: 'JSX', tsx: 'TSX',
    html: 'HTML', css: 'CSS', scss: 'SCSS', sass: 'Sass',
    json: 'JSON', bash: 'Bash', sh: 'Shell', shell: 'Shell',
    python: 'Python', py: 'Python',
    rust: 'Rust', go: 'Go', java: 'Java',
    csharp: 'C#', cs: 'C#', cpp: 'C++', c: 'C',
    markdown: 'Markdown', md: 'Markdown',
    yaml: 'YAML', yml: 'YAML', toml: 'TOML',
    xml: 'XML', sql: 'SQL', graphql: 'GraphQL',
    svelte: 'Svelte', vue: 'Vue',
  };

  function getLang(preEl) {
    const classes = [
      ...Array.from(preEl.classList),
      ...Array.from(preEl.querySelector('code')?.classList ?? []),
    ];
    for (const cls of classes) {
      const m = cls.match(/^language-(.+)$/);
      if (m) {
        const raw = m[1].toLowerCase();
        return LANG_LABELS[raw] ?? raw.toUpperCase();
      }
    }
    return null;
  }

  function enhance() {
    document.querySelectorAll('pre[class*="language-"]').forEach((pre) => {
      if (pre.parentElement?.classList.contains('code-block-wrapper')) return;

      const lang = getLang(pre);

      const wrapper = document.createElement('div');
      wrapper.classList.add('code-block-wrapper');
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      // Header bar
      const bar = document.createElement('div');
      bar.className = 'code-lang-label';

      if (lang) {
        const nameSpan = document.createElement('span');
        nameSpan.className = 'lang-name';
        const dot = document.createElement('span');
        dot.className = 'lang-dot';
        nameSpan.appendChild(dot);
        nameSpan.appendChild(document.createTextNode(lang));
        bar.appendChild(nameSpan);
      }

      // Copy button lives inside the bar
      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      btn.textContent = 'Copy';
      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code')?.innerText ?? pre.innerText;
        try {
          await navigator.clipboard.writeText(code);
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
        } catch {
          btn.textContent = 'Failed';
        }
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
      });
      bar.appendChild(btn);
      wrapper.insertBefore(bar, pre);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhance);
  } else {
    enhance();
  }
})();

