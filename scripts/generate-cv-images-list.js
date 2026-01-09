#!/usr/bin/env node

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    GENERATE CV IMAGES LIST (BUILD-TIME)                     ║
// ║                                                                              ║
// ║  Scans source/images/cv-images/ and generates a JSON list of all images     ║
// ║  Output: source/config/cv-images.json                                       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const CV_IMAGES_DIR = path.join(rootDir, 'source/images/cv-images');
const OUTPUT_FILE = path.join(rootDir, 'source/config/cv-images.json');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function generateCvImagesList() {
  console.log('🖼️  Scanning CV images folder...');
  
  // Check if folder exists
  if (!fs.existsSync(CV_IMAGES_DIR)) {
    console.warn(`⚠️  CV images folder not found: ${CV_IMAGES_DIR}`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ images: [] }, null, 2));
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

  // Write to config file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`✅ Generated: ${OUTPUT_FILE}`);
}

generateCvImagesList();
