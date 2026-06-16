// Generates self-contained KaTeX assets for the Rust PDF pipeline.
// - katex-embedded.css: katex.min.css with woff2 fonts inlined as base64 data URIs
// - katex.min.js / auto-render.min.js: copied verbatim
// These are embedded into the binary via include_str! (see pdf.rs / katex_assets.rs).
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'node_modules', 'katex', 'dist');
const outDir = join(root, 'src-tauri', 'katex');
mkdirSync(outDir, { recursive: true });

let css = readFileSync(join(dist, 'katex.min.css'), 'utf8');

// Inline every woff2 font as a data URI. Drop the woff/ttf fallbacks so the
// browser never tries to fetch a (missing) relative file.
css = css.replace(
  /url\(fonts\/([^)]+?\.woff2)\)\s*format\("woff2"\)(,\s*url\(fonts\/[^)]+?\.woff\)\s*format\("woff"\))?(,\s*url\(fonts\/[^)]+?\.ttf\)\s*format\("truetype"\))?/g,
  (_m, woff2) => {
    const b64 = readFileSync(join(dist, 'fonts', woff2)).toString('base64');
    return `url(data:font/woff2;base64,${b64}) format("woff2")`;
  }
);

writeFileSync(join(outDir, 'katex-embedded.css'), css);
copyFileSync(join(dist, 'katex.min.js'), join(outDir, 'katex.min.js'));
copyFileSync(join(dist, 'contrib', 'auto-render.min.js'), join(outDir, 'auto-render.min.js'));

console.log(`KaTeX bundled -> ${outDir}`);
console.log(`  katex-embedded.css: ${(css.length / 1024).toFixed(0)} KB`);
