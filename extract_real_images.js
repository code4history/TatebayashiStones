#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to recursively find all jpg files
function findJpgFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            findJpgFiles(filePath, fileList);
        } else if (stat.isFile() && /\.(jpg|jpeg)$/i.test(file)) {
            // Store relative path from images directory
            const relativePath = path.relative(path.join(__dirname, 'images'), filePath);
            fileList.push(relativePath);
        }
    });
    
    return fileList;
}

// Find all jpg files in images directory
const imagesDir = path.join(__dirname, 'images');
const jpgFiles = findJpgFiles(imagesDir);

// Sort the files
jpgFiles.sort();

// Write to file
const outputPath = path.join(__dirname, 'real_images.txt');
fs.writeFileSync(outputPath, jpgFiles.join('\n') + '\n');

console.log(`Found ${jpgFiles.length} jpg files in images directory`);
console.log(`Results written to ${outputPath}`);