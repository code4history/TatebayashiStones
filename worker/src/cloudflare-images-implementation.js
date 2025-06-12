/**
 * Cloudflare Images implementation
 * This uses Cloudflare Images service instead of R2 for better image management
 */

import { v4 as uuidv4 } from 'uuid';

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

    // Handle image upload for POST requests
    if (request.method === 'POST') {
      return handleImageUpload(request, env, corsHeaders);
    }

    // Default response
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }
};

/**
 * Handle image upload to Cloudflare Images
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

    // Generate UUID for image ID
    const imageId = uuidv4();
    
    // Create form data for Cloudflare Images API
    const cfFormData = new FormData();
    cfFormData.append('file', file);
    cfFormData.append('id', imageId);
    
    // Add metadata
    const metadata = {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      size: file.size,
      type: file.type
    };
    cfFormData.append('metadata', JSON.stringify(metadata));

    // Upload to Cloudflare Images
    const uploadResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/images/v1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CF_IMAGES_TOKEN}`
        },
        body: cfFormData
      }
    );

    const uploadResult = await uploadResponse.json();

    if (!uploadResult.success) {
      throw new Error('Failed to upload image: ' + JSON.stringify(uploadResult.errors));
    }

    const imageData = uploadResult.result;

    // Return success response with image variants
    return new Response(JSON.stringify({
      success: true,
      id: imageId,
      filename: imageData.filename,
      originalName: file.name,
      size: file.size,
      type: file.type,
      uploaded: imageData.uploaded,
      variants: imageData.variants,
      urls: {
        // Cloudflare Images provides automatic variants
        original: getVariantUrl(imageData.variants, 'public'),
        mid: getVariantUrl(imageData.variants, 'medium') || createCustomVariantUrl(env.CF_ACCOUNT_HASH, imageId, 800, 600),
        small: getVariantUrl(imageData.variants, 'thumbnail') || createCustomVariantUrl(env.CF_ACCOUNT_HASH, imageId, 400, 300),
        // Custom sizes can be created on-demand
        custom: `https://imagedelivery.net/${env.CF_ACCOUNT_HASH}/${imageId}/w={width},h={height},fit=contain`
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
 * Get variant URL from variants array
 */
function getVariantUrl(variants, variantName) {
  const variant = variants.find(v => v.includes(`/${variantName}`));
  return variant || null;
}

/**
 * Create custom variant URL
 */
function createCustomVariantUrl(accountHash, imageId, width, height) {
  return `https://imagedelivery.net/${accountHash}/${imageId}/w=${width},h=${height},fit=contain`;
}

/**
 * Alternative: Direct URL upload (for migrating existing images)
 */
export async function uploadImageFromUrl(imageUrl, env) {
  const imageId = uuidv4();
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/images/v1`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CF_IMAGES_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: imageUrl,
        id: imageId,
        metadata: {
          source: 'migration',
          originalUrl: imageUrl,
          migratedAt: new Date().toISOString()
        }
      })
    }
  );

  return await response.json();
}