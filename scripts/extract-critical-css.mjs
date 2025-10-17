/**
 * Extract Critical CSS Script
 * Extracts above-the-fold CSS and generates optimized HTML
 */

import { generate } from 'critical';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractCriticalCSS() {
  try {
    console.log('Starting critical CSS extraction...\n');

    const inputHtml = path.join(__dirname, '../public/radio-modular.html');
    const outputHtml = path.join(__dirname, '../public/radio-modular-critical.html');
    const cssPath = path.join(__dirname, '../public/dist/styles.min.css');

    // Check if bundled CSS exists
    try {
      await fs.access(cssPath);
    } catch (error) {
      console.error('Error: Bundled CSS not found. Run "npm run build:css" first.');
      process.exit(1);
    }

    console.log('Analyzing page and extracting critical CSS...');
    console.log(`Input:  ${inputHtml}`);
    console.log(`Output: ${outputHtml}\n`);

    const { html, css } = await generate({
      src: inputHtml,
      css: [cssPath],
      width: 1300,
      height: 900,
      inline: true,
      extract: true,
      ignore: {
        atrule: ['@font-face'], // Don't inline font-faces
        rule: [/\.hidden/, /\.loading/] // Keep loading states
      },
      penthouse: {
        timeout: 30000
      }
    });

    // Write the optimized HTML
    await fs.writeFile(outputHtml, html);

    // Save the extracted critical CSS separately for reference
    const criticalCssPath = path.join(__dirname, '../public/dist/critical.css');
    await fs.writeFile(criticalCssPath, css);

    console.log('✅ Critical CSS extraction complete!');
    console.log(`\n📊 Results:`);
    console.log(`   - Optimized HTML: ${outputHtml}`);
    console.log(`   - Critical CSS: ${criticalCssPath}`);
    console.log(`   - Critical CSS size: ${(css.length / 1024).toFixed(2)} KB`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review the generated file: radio-modular-critical.html`);
    console.log(`   2. Test the page to ensure it renders correctly`);
    console.log(`   3. If satisfied, replace radio-modular.html with the optimized version\n`);

  } catch (error) {
    console.error('❌ Error extracting critical CSS:', error);
    process.exit(1);
  }
}

// Run the extraction
extractCriticalCSS();
