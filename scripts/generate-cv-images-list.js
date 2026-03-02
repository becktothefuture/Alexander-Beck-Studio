#!/usr/bin/env node

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    GENERATE CV IMAGES LIST (BUILD-TIME)                     ║
// ║                                                                              ║
// ║  Scans html-site/source/images/cv-images/ and generates cv-images.json       ║
// ║  Writes to both html-site/source/config/ and react-app/app/public/config/   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const CV_IMAGES_DIR = path.join(rootDir, 'html-site', 'source', 'images', 'cv-images');
const OUTPUT_HTML = path.join(rootDir, 'html-site', 'source', 'config', 'cv-images.json');
const OUTPUT_REACT = path.join(rootDir, 'react-app', 'app', 'public', 'config', 'cv-images.json');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function generateCvImagesList() {
  console.log('🖼️  Scanning CV images folder...');
  
  // Check if folder exists
  if (!fs.existsSync(CV_IMAGES_DIR)) {
    console.warn(`⚠️  CV images folder not found: ${CV_IMAGES_DIR}`);
    const empty = JSON.stringify({ images: [], folder: 'images/cv-images/', count: 0, generated: new Date().toISOString() }, null, 2);
    try {
      fs.writeFileSync(OUTPUT_HTML, empty);
      fs.writeFileSync(OUTPUT_REACT, empty);
    } catch (e) {
      console.warn('Could not write empty output to both locations:', e.message);
    }
    return;
  }

  // Read all files in the directory
  const files = fs.readdirSync(CV_IMAGES_DIR);
  
  // Filter for image files only
  const imageFiles = files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
  }).sort(); // Sort alphabetically for consistency

  console.log(`📸 Found ${imageFiles.length} image(s):`);
  imageFiles.forEach((file) => console.log(`   - ${file}`));

  // Generate JSON output
  const output = {
    folder: 'images/cv-images/',
    images: imageFiles,
    count: imageFiles.length,
    generated: new Date().toISOString(),
  };

  // Write to both html-site and react-app
  const json = JSON.stringify(output, null, 2);
  fs.writeFileSync(OUTPUT_HTML, json);
  fs.writeFileSync(OUTPUT_REACT, json);
  console.log(`✅ Generated: ${OUTPUT_HTML}`);
  console.log(`✅ Generated: ${OUTPUT_REACT}`);
}

generateCvImagesList();
