#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read pois.geojson
const poisPath = path.join(__dirname, 'pois.geojson');
const poisData = JSON.parse(fs.readFileSync(poisPath, 'utf8'));

// Extract image references
const imageReferences = [];

poisData.features.forEach(feature => {
    if (feature.properties && feature.properties.primary_image) {
        const primaryImage = feature.properties.primary_image;
        if (primaryImage && primaryImage !== null && primaryImage !== "") {
            // primary_image appears to be an ID number, so we need to construct the image path
            // Based on the directory structure, images are stored in images/[id]/ folders
            imageReferences.push(`${primaryImage}`);
        }
    }
});

// Sort and remove duplicates
const uniqueImages = [...new Set(imageReferences)].sort();

// Write to file
const outputPath = path.join(__dirname, 'pois_images.txt');
fs.writeFileSync(outputPath, uniqueImages.join('\n') + '\n');

console.log(`Found ${uniqueImages.length} unique image references in pois.geojson`);
console.log(`Results written to ${outputPath}`);