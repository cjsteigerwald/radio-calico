#!/usr/bin/env node
/**
 * Convert RadioCalico logo to WebP format
 * This script optimizes the logo for web performance
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../public/RadioCalicoLogoTM.png');
const outputPath = path.join(__dirname, '../public/RadioCalicoLogoTM.webp');

async function convertLogo() {
  try {
    console.log('Converting logo to WebP format...');

    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      console.error('Error: Input file not found at', inputPath);
      process.exit(1);
    }

    // Get original file size
    const originalStats = fs.statSync(inputPath);
    const originalSize = (originalStats.size / 1024).toFixed(2);
    console.log(`Original PNG size: ${originalSize} KB`);

    // Convert to WebP with quality 85 (good balance)
    await sharp(inputPath)
      .webp({ quality: 85 })
      .toFile(outputPath);

    // Get new file size
    const newStats = fs.statSync(outputPath);
    const newSize = (newStats.size / 1024).toFixed(2);
    const savings = ((1 - newSize / originalSize) * 100).toFixed(1);

    console.log(`✓ WebP created: ${outputPath}`);
    console.log(`WebP size: ${newSize} KB`);
    console.log(`Savings: ${savings}% (${(originalSize - newSize).toFixed(2)} KB)`);

    // Also create multiple sizes for different use cases
    console.log('\nCreating multiple sizes...');

    const sizes = [
      { name: 'favicon', width: 32 },
      { name: 'icon-192', width: 192 },
      { name: 'icon-512', width: 512 }
    ];

    for (const size of sizes) {
      const sizePath = path.join(__dirname, `../public/RadioCalicoLogoTM-${size.name}.webp`);
      await sharp(inputPath)
        .resize(size.width, size.width, { fit: 'contain' })
        .webp({ quality: 85 })
        .toFile(sizePath);

      const sizeStats = fs.statSync(sizePath);
      console.log(`✓ Created ${size.name}: ${(sizeStats.size / 1024).toFixed(2)} KB`);
    }

    console.log('\n✓ Logo conversion complete!');
  } catch (error) {
    console.error('Error converting logo:', error);
    process.exit(1);
  }
}

convertLogo();
