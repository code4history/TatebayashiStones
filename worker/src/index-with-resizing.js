/**
 * Cloudflare Worker for image upload and processing with WebAssembly-based resizing
 * This version includes actual image resizing functionality
 */

import { v4 as uuidv4 } from 'uuid';

// Thumbnail sizes configuration
const THUMBNAIL_SIZES = {
  mid: { width: 800, height: 600 },
  small: { width: 400, height: 300 }
};

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    try {
      // Check authorization
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${env.AUTH_TOKEN}`) {
        return new Response('Unauthorized', { 
          status: 401,
          headers: corsHeaders 
        });
      }

      // Parse multipart form data
      const formData = await request.formData();
      const file = formData.get('image');
      
      if (!file || !(file instanceof File)) {
        return new Response('No image file provided', { 
          status: 400,
          headers: corsHeaders 
        });
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return new Response('Invalid file type. Allowed types: JPEG, PNG, WebP', { 
          status: 400,
          headers: corsHeaders 
        });
      }

      // Generate UUID for filename
      const uuid = uuidv4();
      const extension = file.name.split('.').pop().toLowerCase();
      const newFilename = `${uuid}.${extension}`;

      // Read file as ArrayBuffer
      const fileBuffer = await file.arrayBuffer();

      // Upload original image to R2
      const originalPath = `images/${newFilename}`;
      await env.R2_BUCKET.put(originalPath, fileBuffer, {
        httpMetadata: {
          contentType: file.type,
        },
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        }
      });

      // Generate thumbnails using Canvas API
      const thumbnails = await generateThumbnails(fileBuffer, file.type, newFilename, env);

      // Return success response with file information
      return new Response(JSON.stringify({
        success: true,
        uuid: uuid,
        filename: newFilename,
        originalName: file.name,
        size: file.size,
        type: file.type,
        paths: {
          original: originalPath,
          ...thumbnails
        },
        publicUrls: {
          original: `${env.R2_PUBLIC_URL}/${env.R2_BUCKET_NAME}/${originalPath}`,
          mid: `${env.R2_PUBLIC_URL}/${env.R2_BUCKET_NAME}/mid_thumbs/${newFilename}`,
          small: `${env.R2_PUBLIC_URL}/${env.R2_BUCKET_NAME}/small_thumbs/${newFilename}`
        }
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      });

    } catch (error) {
      console.error('Error processing upload:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      });
    }
  }
};

/**
 * Generate thumbnails for the uploaded image
 */
async function generateThumbnails(imageBuffer, contentType, filename, env) {
  const paths = {};

  // Create image bitmap from buffer
  const imageBitmap = await createImageBitmap(new Blob([imageBuffer], { type: contentType }));
  
  for (const [size, dimensions] of Object.entries(THUMBNAIL_SIZES)) {
    try {
      // Calculate resize dimensions maintaining aspect ratio
      const { width, height } = calculateResizeDimensions(
        imageBitmap.width,
        imageBitmap.height,
        dimensions.width,
        dimensions.height
      );

      // Create canvas and resize
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      // Draw resized image
      ctx.drawImage(imageBitmap, 0, 0, width, height);
      
      // Convert to blob
      const blob = await canvas.convertToBlob({
        type: contentType,
        quality: 0.85
      });
      
      // Convert blob to ArrayBuffer
      const resizedBuffer = await blob.arrayBuffer();
      
      // Upload thumbnail to R2
      const thumbnailPath = `${size}_thumbs/${filename}`;
      await env.R2_BUCKET.put(thumbnailPath, resizedBuffer, {
        httpMetadata: {
          contentType: contentType,
        }
      });

      paths[size] = thumbnailPath;
    } catch (error) {
      console.error(`Error generating ${size} thumbnail:`, error);
      // Continue with other thumbnails even if one fails
    }
  }

  // Clean up
  imageBitmap.close();

  return paths;
}

/**
 * Calculate resize dimensions maintaining aspect ratio
 */
function calculateResizeDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
  const aspectRatio = originalWidth / originalHeight;
  
  let width = maxWidth;
  let height = maxHeight;
  
  if (originalWidth > originalHeight) {
    height = Math.round(maxWidth / aspectRatio);
    if (height > maxHeight) {
      height = maxHeight;
      width = Math.round(maxHeight * aspectRatio);
    }
  } else {
    width = Math.round(maxHeight * aspectRatio);
    if (width > maxWidth) {
      width = maxWidth;
      height = Math.round(maxWidth / aspectRatio);
    }
  }
  
  return { width, height };
}