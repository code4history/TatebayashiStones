#!/usr/bin/env node

const fs = require('fs');

// Read both files
const geojsonImages = fs.readFileSync('images_geojson_paths.txt', 'utf8').trim().split('\n').filter(line => line.trim());
const realImages = fs.readFileSync('real_images.txt', 'utf8').trim().split('\n').filter(line => line.trim());

console.log(`Images referenced in images.geojson: ${geojsonImages.length}`);
console.log(`Actual image files in images folder: ${realImages.length}`);

// Sort both arrays for comparison
geojsonImages.sort();
realImages.sort();

// Find differences
const missingInReal = geojsonImages.filter(img => !realImages.includes(img));
const missingInGeojson = realImages.filter(img => !geojsonImages.includes(img));

console.log(`\nImages referenced in geojson but missing from filesystem: ${missingInReal.length}`);
if (missingInReal.length > 0) {
    console.log('Missing files (first 10):');
    missingInReal.slice(0, 10).forEach(img => console.log(`  ${img}`));
    if (missingInReal.length > 10) {
        console.log(`  ... and ${missingInReal.length - 10} more`);
    }
}

console.log(`\nImage files on filesystem but not referenced in geojson: ${missingInGeojson.length}`);
if (missingInGeojson.length > 0) {
    console.log('Unreferenced files (first 10):');
    missingInGeojson.slice(0, 10).forEach(img => console.log(`  ${img}`));
    if (missingInGeojson.length > 10) {
        console.log(`  ... and ${missingInGeojson.length - 10} more`);
    }
}

// Check for exact match
const exactMatch = geojsonImages.length === realImages.length && 
                   missingInReal.length === 0 && 
                   missingInGeojson.length === 0;

console.log(`\n=== SUMMARY ===`);
console.log(`Total images in geojson: ${geojsonImages.length}`);
console.log(`Total images on filesystem: ${realImages.length}`);
console.log(`Perfect match: ${exactMatch ? 'YES' : 'NO'}`);
console.log(`Missing files: ${missingInReal.length}`);
console.log(`Unreferenced files: ${missingInGeojson.length}`);