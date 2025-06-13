#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read both files
const poisImages = fs.readFileSync('pois_images.txt', 'utf8').trim().split('\n').filter(line => line.trim());
const realImages = fs.readFileSync('real_images.txt', 'utf8').trim().split('\n').filter(line => line.trim());

// Extract directory IDs from real images
const realImageDirs = [...new Set(realImages.map(img => img.split('/')[0]))].sort();

// Convert to numbers for proper comparison
const poisIds = poisImages.map(id => parseInt(id)).filter(id => !isNaN(id)).sort((a, b) => a - b);
const realIds = realImageDirs.map(id => parseInt(id)).filter(id => !isNaN(id)).sort((a, b) => a - b);

console.log(`POIs referenced in pois.geojson: ${poisIds.length}`);
console.log(`Image directories in images folder: ${realIds.length}`);
console.log(`Total actual image files: ${realImages.length}`);

// Find differences
const missingInReal = poisIds.filter(id => !realIds.includes(id));
const missingInPois = realIds.filter(id => !poisIds.includes(id));

console.log(`\nIDs referenced in POIs but missing image directories: ${missingInReal.length}`);
if (missingInReal.length > 0) {
    console.log('Missing directories:', missingInReal.slice(0, 20).join(', ') + (missingInReal.length > 20 ? '...' : ''));
}

console.log(`\nImage directories without POI references: ${missingInPois.length}`);
if (missingInPois.length > 0) {
    console.log('Unreferenced directories:', missingInPois.slice(0, 20).join(', ') + (missingInPois.length > 20 ? '...' : ''));
}

// Show some stats about image count per directory
const imageCountPerDir = {};
realImages.forEach(img => {
    const dir = img.split('/')[0];
    imageCountPerDir[dir] = (imageCountPerDir[dir] || 0) + 1;
});

const dirCounts = Object.entries(imageCountPerDir).map(([dir, count]) => ({ dir, count })).sort((a, b) => b.count - a.count);
console.log(`\nTop 10 directories by image count:`);
dirCounts.slice(0, 10).forEach(({dir, count}) => {
    console.log(`  ${dir}: ${count} images`);
});

console.log(`\nSummary:`);
console.log(`- POI references: ${poisIds.length}`);
console.log(`- Image directories: ${realIds.length}`);
console.log(`- Total image files: ${realImages.length}`);
console.log(`- Missing directories: ${missingInReal.length}`);
console.log(`- Unreferenced directories: ${missingInPois.length}`);