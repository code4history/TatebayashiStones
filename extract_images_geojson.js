#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read images.geojson
const imagesPath = path.join(__dirname, 'images.geojson');
const imagesData = JSON.parse(fs.readFileSync(imagesPath, 'utf8'));

// Extract image paths
const imagePaths = [];

imagesData.features.forEach(feature => {
    if (feature.properties && feature.properties.path) {
        let imagePath = feature.properties.path;
        // Remove the leading "./" if present
        if (imagePath.startsWith('./')) {
            imagePath = imagePath.substring(2);
        }
        // Remove the leading "images/" if present to match the format of real_images.txt
        if (imagePath.startsWith('images/')) {
            imagePath = imagePath.substring(7);
        }
        imagePaths.push(imagePath);
    }
});

// Sort the paths
imagePaths.sort();

// Write to file
const outputPath = path.join(__dirname, 'images_geojson_paths.txt');
fs.writeFileSync(outputPath, imagePaths.join('\n') + '\n');

console.log(`Found ${imagePaths.length} image paths in images.geojson`);
console.log(`Results written to ${outputPath}`);