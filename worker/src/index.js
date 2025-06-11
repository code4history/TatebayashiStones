/**
 * Cloudflare Worker for image upload and processing
 * Handles image uploads to R2, generates thumbnails, and manages files with UUID names
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
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route to static file serving for GET requests with path
    if (request.method === 'GET' && url.pathname !== '/') {
      return handleStaticServing(request, env, corsHeaders);
    }

    // Handle image upload for POST requests
    if (request.method === 'POST') {
      return handleImageUpload(request, env, corsHeaders);
    }

    // Default response for other cases
    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders 
    });
  }
};

/**
 * Handle static file serving from R2
 */
async function handleStaticServing(request, env, corsHeaders) {
  const url = new URL(request.url);
  // Remove leading slash and decode URL
  let path = decodeURIComponent(url.pathname.slice(1));
  
  // Remove bucket name from path if present
  if (path.startsWith(`${env.R2_BUCKET_NAME}/`)) {
    path = path.slice(env.R2_BUCKET_NAME.length + 1);
  }
  
  console.log('Requested path:', path);
  
  try {
    // Try to get the object from R2
    const object = await env.R2_BUCKET.get(path);
    
    if (object === null) {
      // List objects to debug
      const list = await env.R2_BUCKET.list({ limit: 10 });
      console.log('R2 bucket objects:', list.objects.map(obj => obj.key));
      
      return new Response(`Not Found: ${path}`, { 
        status: 404,
        headers: corsHeaders 
      });
    }

    // Prepare headers
    const headers = new Headers(object.httpMetadata || {});
    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    // Set Content-Type if not already set
    if (!headers.has('Content-Type')) {
      const contentType = getContentType(path);
      headers.set('Content-Type', contentType);
    }

    // Set cache headers
    headers.set('Cache-Control', 'public, max-age=3600');
    
    // Add ETag if available
    if (object.httpEtag) {
      headers.set('ETag', object.httpEtag);
    }

    // Handle conditional requests
    const ifNoneMatch = request.headers.get('If-None-Match');
    if (ifNoneMatch && object.httpEtag && ifNoneMatch === object.httpEtag) {
      return new Response(null, { 
        status: 304,
        headers 
      });
    }

    // Return the object
    return new Response(object.body, {
      headers
    });
  } catch (error) {
    console.error('Error serving static file:', error);
    return new Response('Internal Server Error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
}

/**
 * Get content type from file extension
 */
function getContentType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const mimeTypes = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    
    // Documents
    'pdf': 'application/pdf',
    'json': 'application/json',
    'xml': 'application/xml',
    
    // Text
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'txt': 'text/plain',
    'csv': 'text/csv',
    
    // Fonts
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf',
    
    // Video
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogv': 'video/ogg',
    
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'oga': 'audio/ogg',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Handle image upload
 */
async function handleImageUpload(request, env, corsHeaders) {
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

    // Generate thumbnails
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
      urls: {
        original: `https://${env.CUSTOM_DOMAIN || 'r2.code4history.dev'}/${env.R2_BUCKET_NAME}/${originalPath}`,
        mid: `https://${env.CUSTOM_DOMAIN || 'r2.code4history.dev'}/${env.R2_BUCKET_NAME}/mid_thumbs/${newFilename}`,
        small: `https://${env.CUSTOM_DOMAIN || 'r2.code4history.dev'}/${env.R2_BUCKET_NAME}/small_thumbs/${newFilename}`
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

/**
 * Generate thumbnails for the uploaded image
 */
async function generateThumbnails(imageBuffer, contentType, filename, env) {
  const paths = {};

  for (const [size, dimensions] of Object.entries(THUMBNAIL_SIZES)) {
    try {
      // Use Cloudflare Image Resizing API
      const resizedImage = await resizeImage(imageBuffer, dimensions, contentType, env);
      
      // Upload thumbnail to R2
      const thumbnailPath = `${size}_thumbs/${filename}`;
      await env.R2_BUCKET.put(thumbnailPath, resizedImage, {
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

  return paths;
}

/**
 * Resize image using Cloudflare Image Resizing
 * Note: This requires either:
 * 1. A custom domain with Image Resizing enabled, or
 * 2. Using the Cloudflare Images API (separate service)
 * 
 * For R2-only setup, we'll use a simpler approach with the browser-image-resizing library
 */
async function resizeImage(imageBuffer, dimensions, contentType, env) {
  // For now, we'll implement a basic resize using the original image
  // In production, you should either:
  // 1. Set up a custom domain with Cloudflare Image Resizing
  // 2. Use Cloudflare Images API
  // 3. Use a WebAssembly-based image processing library
  
  // Temporary implementation: return original image
  // TODO: Implement actual resizing
  console.warn(`Image resizing not implemented. Returning original image for ${dimensions.width}x${dimensions.height}`);
  return imageBuffer;
}