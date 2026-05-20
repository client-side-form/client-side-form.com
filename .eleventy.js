const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
const markdownIt = require("markdown-it");
const markdownItCheckbox = require("markdown-it-checkbox");

module.exports = function (eleventyConfig) {
  // Plugins
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(eleventyNavigationPlugin);

  // Markdown-it with checkbox support
  const md = markdownIt({
    html: true,
    linkify: true,
    typographer: true,
  }).use(markdownItCheckbox, {
    divWrap: false,
    divClass: "checkbox-wrap",
    idPrefix: "cbx_",
    ulClass: "task-list",
    liClass: "task-list-item",
  });
  eleventyConfig.setLibrary("md", md);

  // Passthrough copies
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy({ "assets/manifest.json": "manifest.json" });
  eleventyConfig.addPassthroughCopy({ "assets/js/sw.js": "sw.js" });
  eleventyConfig.addPassthroughCopy({ "assets/icons/favicon.ico": "favicon.ico" });
  eleventyConfig.addPassthroughCopy({ "assets/robots.txt": "robots.txt" });

  // Filter: strip the first <h1> from rendered content (avoids duplicate with layout)
  eleventyConfig.addFilter("stripFirstH1", (content) => {
    if (typeof content !== "string") return content;
    return content.replace(/^(\s*)<h1[^>]*>.*?<\/h1>\s*/i, "");
  });

  // Shortcode: current year for footer
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  // Filter: get page URL prefix for active nav detection
  eleventyConfig.addFilter("startsWith", (str, prefix) =>
    typeof str === "string" && str.startsWith(prefix)
  );

  // Filter: split string (Nunjucks doesn't have split by default)
  eleventyConfig.addFilter("split", (str, separator) =>
    typeof str === "string" ? str.split(separator) : []
  );

  // Filter: ISO date string for sitemap (YYYY-MM-DD)
  eleventyConfig.addFilter("isoDate", (date) => {
    if (!date) return new Date().toISOString().split("T")[0];
    return new Date(date).toISOString().split("T")[0];
  });

  // Filter: generate JSON-LD <script> tags for a page
  // Usage: {{ page.url | pageJsonLd(collections.all, title, description, pageType) | safe }}
  eleventyConfig.addFilter("pageJsonLd", function (pageUrl, allPages, title, description, pageType) {
    const siteUrl = "https://www.client-side-form.com";
    const fullUrl = siteUrl + pageUrl;
    const orgPublisher = { "@type": "Organization", "name": "ClientSideForm", "url": siteUrl };

    const schemas = [];

    if (pageUrl === "/") {
      // Home page — WebSite schema
      schemas.push({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": title || "Client-Side Form State & Validation Architecture",
        "url": siteUrl,
        "description": description || "",
        "publisher": orgPublisher,
      });
    } else {
      // Build breadcrumb trail from URL segments
      const segments = pageUrl.split("/").filter(Boolean);
      const breadcrumbItems = [{ name: "Home", id: siteUrl + "/" }];
      for (let i = 0; i < segments.length; i++) {
        const partialUrl = "/" + segments.slice(0, i + 1).join("/") + "/";
        const found = (allPages || []).find((p) => p.url === partialUrl);
        const segTitle = found ? found.data.title : segments[i].replace(/-/g, " ");
        breadcrumbItems.push({ name: segTitle, id: siteUrl + partialUrl });
      }

      schemas.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbItems.map((item, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "name": item.name,
          "item": item.id,
        })),
      });

      if (pageType === "article") {
        schemas.push({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          "headline": title || "",
          "description": description || "",
          "url": fullUrl,
          "publisher": orgPublisher,
          "author": orgPublisher,
          "inLanguage": "en",
        });
      } else {
        // pillar / collection page
        schemas.push({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": title || "",
          "description": description || "",
          "url": fullUrl,
          "publisher": orgPublisher,
          "inLanguage": "en",
        });
      }
    }

    return schemas
      .map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
      .join("\n  ");
  });

  return {
    dir: {
      input: "content",
      output: "_site",
      includes: "../_includes",
      layouts: "../_includes",
      data: "../_data",
    },
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"],
  };
};


