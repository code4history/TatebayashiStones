/**
 * Image resizing module using WebAssembly
 * This module provides efficient image resizing capabilities for Cloudflare Workers
 */

import { ImageMagick, initialize, MagickFormat } from '@cloudflare/imagemagick-wasm';
import magickWasm from '@cloudflare/imagemagick-wasm/magick.wasm';

// Initialize ImageMagick WASM once
let initialized = false;

async function initializeImageMagick() {
  if (!initialized) {
    await initialize(magickWasm);
    initialized = true;
  }
}

/**
 * Resize an image to specified dimensions
 * @param {ArrayBuffer} imageBuffer - The original image buffer
 * @param {Object} dimensions - Target dimensions {width, height}
 * @param {string} format - Output format (jpeg, png, webp)
 * @param {number} quality - Output quality (1-100)
 * @returns {Promise<ArrayBuffer>} - Resized image buffer
 */
export async function resizeImage(imageBuffer, dimensions, format = 'jpeg', quality = 85) {
  await initializeImageMagick();

  return new Promise((resolve, reject) => {
    try {
      ImageMagick.read(new Uint8Array(imageBuffer), (img) => {
        // Calculate dimensions maintaining aspect ratio
        const originalWidth = img.width;
        const originalHeight = img.height;
        const { width, height } = calculateAspectRatio(
          originalWidth,
          originalHeight,
          dimensions.width,
          dimensions.height
        );

        // Resize the image
        img.resize(width, height);
        
        // Set quality
        img.quality = quality;

        // Write to the specified format
        const outputFormat = getImageMagickFormat(format);
        img.write((data) => {
          resolve(data.buffer);
        }, outputFormat);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Calculate dimensions maintaining aspect ratio
 */
function calculateAspectRatio(originalWidth, originalHeight, maxWidth, maxHeight) {
  const aspectRatio = originalWidth / originalHeight;
  
  let width = maxWidth;
  let height = maxHeight;
  
  if (originalWidth / originalHeight > maxWidth / maxHeight) {
    // Image is wider than target aspect ratio
    height = Math.round(maxWidth / aspectRatio);
  } else {
    // Image is taller than target aspect ratio
    width = Math.round(maxHeight * aspectRatio);
  }
  
  return { width, height };
}

/**
 * Get ImageMagick format enum from string
 */
function getImageMagickFormat(format) {
  const formats = {
    'jpeg': MagickFormat.Jpeg,
    'jpg': MagickFormat.Jpeg,
    'png': MagickFormat.Png,
    'webp': MagickFormat.Webp,
    'gif': MagickFormat.Gif
  };
  
  return formats[format.toLowerCase()] || MagickFormat.Jpeg;
}

/**
 * Process image with auto-orientation and optimization
 */
export async function processImage(imageBuffer, options = {}) {
  await initializeImageMagick();

  const {
    width,
    height,
    format = 'jpeg',
    quality = 85,
    autoOrient = true,
    strip = true
  } = options;

  return new Promise((resolve, reject) => {
    try {
      ImageMagick.read(new Uint8Array(imageBuffer), (img) => {
        // Auto-orient based on EXIF data
        if (autoOrient) {
          img.autoOrient();
        }

        // Strip metadata if requested
        if (strip) {
          img.strip();
        }

        // Resize if dimensions provided
        if (width || height) {
          const targetWidth = width || img.width;
          const targetHeight = height || img.height;
          const dims = calculateAspectRatio(img.width, img.height, targetWidth, targetHeight);
          img.resize(dims.width, dims.height);
        }

        // Set quality
        img.quality = quality;

        // Write to format
        const outputFormat = getImageMagickFormat(format);
        img.write((data) => {
          resolve(data.buffer);
        }, outputFormat);
      });
    } catch (error) {
      reject(error);
    }
  });
}