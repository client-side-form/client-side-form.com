// Content-hash first-party CSS/JS so cache-busting `?v=` query strings change
// whenever a source file changes. Consumed in templates as `assets.<key>`.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ASSETS_DIR = path.join(__dirname, "..", "assets");

// Map of exported key -> source file (relative to the assets/ dir).
const FILES = {
  mainCss: "css/main.css",
  mainJs: "js/main.js",
  copyCodeJs: "js/copy-code.js",
};

// Resolve a CSS @import target relative to the importing file's directory.
function resolveImport(fromFile, spec) {
  const clean = spec.replace(/^["']|["']$/g, "").replace(/^url\(|\)$/g, "").replace(/^["']|["']$/g, "");
  return path.resolve(path.dirname(fromFile), clean);
}

// Read a CSS file plus the content of any @import partials it references so the
// hash changes when a partial changes too. Depth-limited to avoid cycles.
function readCssWithImports(file, seen) {
  if (seen.has(file)) return "";
  seen.add(file);
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
  let combined = content;
  const importRe = /@import\s+(?:url\()?\s*(["'][^"']+["']|[^;\s)]+)\s*\)?\s*;?/g;
  let m;
  while ((m = importRe.exec(content)) !== null) {
    const target = resolveImport(file, m[1]);
    combined += "\n" + readCssWithImports(target, seen);
  }
  return combined;
}

function hashContent(str) {
  return crypto.createHash("sha1").update(str).digest("hex").slice(0, 10);
}

const out = {};
for (const [key, rel] of Object.entries(FILES)) {
  const abs = path.join(ASSETS_DIR, rel);
  let content;
  if (rel.endsWith(".css")) {
    content = readCssWithImports(abs, new Set());
  } else {
    content = fs.readFileSync(abs, "utf8");
  }
  out[key] = hashContent(content);
}

module.exports = out;
