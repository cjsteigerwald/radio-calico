/**
 * Inline Critical CSS Script
 * Reads critical.css and inlines it into HTML, sets up async CSS loading
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function inlineCriticalCSS() {
  try {
    console.log('Inlining critical CSS...\n');

    const htmlPath = path.join(__dirname, '../public/radio-modular.html');
    const criticalCssPath = path.join(__dirname, '../public/dist/critical.css');

    // Read files
    let html = await fs.readFile(htmlPath, 'utf-8');
    const criticalCss = await fs.readFile(criticalCssPath, 'utf-8');

    // Replace the CSS link with inline critical CSS + async full CSS
    const cssLinkRegex = /<!-- Bundled & Minified CSS -->\s*<link rel="stylesheet" href="dist\/styles\.min\.css">/;

    const replacement = `<!-- Critical CSS (inlined) -->
    <style>${criticalCss}</style>

    <!-- Full CSS (async loaded) -->
    <link rel="preload" href="dist/styles.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="dist/styles.min.css"></noscript>`;

    html = html.replace(cssLinkRegex, replacement);

    // Also make Google Fonts async
    const fontsRegex = /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Montserrat[^>]+>/;
    html = html.replace(fontsRegex, (match) => {
      return match.replace('rel="stylesheet"', 'rel="preload" as="style" onload="this.onload=null;this.rel=\'stylesheet\'"');
    });

    // Write the updated HTML
    await fs.writeFile(htmlPath, html);

    console.log('✅ Critical CSS inlined successfully!');
    console.log(`   - Critical CSS size: ${(criticalCss.length / 1024).toFixed(2)} KB`);
    console.log(`   - Full CSS will load asynchronously`);
    console.log(`   - Google Fonts will load asynchronously\n`);

  } catch (error) {
    console.error('❌ Error inlining critical CSS:', error);
    process.exit(1);
  }
}

inlineCriticalCSS();
