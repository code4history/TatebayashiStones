/**
 * Cloudflare Worker for image upload using Cloudflare Images
 * Handles image uploads to Cloudflare Images with custom IDs
 */

import { v4 as uuidv4 } from 'uuid';

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Image variants available in Cloudflare Images
const IMAGE_VARIANTS = {
  public: 'public',     // Original size
  mid: 'mid',          // 800x600
  small: 'small'       // 400x300
};

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
    if (request.method === 'POST' && url.pathname === '/upload') {
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

    // Generate unique ID for the image
    const uuid = uuidv4();
    const imageId = `${env.PROJECT_PREFIX}_${uuid}`;

    // Create form data for Cloudflare Images API
    const cfFormData = new FormData();
    cfFormData.append('file', file);
    cfFormData.append('id', imageId);
    
    // Optional: Add metadata
    cfFormData.append('metadata', JSON.stringify({
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      project: env.PROJECT_PREFIX
    }));

    // Upload to Cloudflare Images
    const accountId = env.CLOUDFLARE_ACCOUNT_ID || '61f248de47f07bdbf3dd2133a5378e64';
    
    // Check if API token exists
    if (!env.CLOUDFLARE_IMAGES_API_TOKEN) {
      console.error('CLOUDFLARE_IMAGES_API_TOKEN is not set');
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuration error: Images API token not found'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      });
    }
    
    const uploadResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_IMAGES_API_TOKEN}`
        },
        body: cfFormData
      }
    );

    const uploadResult = await uploadResponse.json();

    if (!uploadResult.success) {
      console.error('Cloudflare Images upload failed:', uploadResult.errors);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to upload image',
        details: uploadResult.errors
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      });
    }

    // Generate URLs for different variants
    let baseUrl;
    if (env.CUSTOM_IMAGES_DOMAIN) {
      // カスタムドメインを使用
      const path = env.CUSTOM_IMAGES_PATH || '/cdn-cgi/imagedelivery';
      if (path === '/images') {
        // Transform Rulesを使用する場合はアカウントハッシュを含めない
        baseUrl = `https://${env.CUSTOM_IMAGES_DOMAIN}${path}`;
      } else {
        // cdn-cgiパスを使用する場合はアカウントハッシュが必要
        baseUrl = `https://${env.CUSTOM_IMAGES_DOMAIN}${path}/${env.IMAGES_ACCOUNT_HASH}`;
      }
    } else {
      // デフォルトのimagedelivery.netを使用
      baseUrl = `https://imagedelivery.net/${env.IMAGES_ACCOUNT_HASH}`;
    }
    
    const urls = {
      original: `${baseUrl}/${imageId}/${IMAGE_VARIANTS.public}`,
      mid: `${baseUrl}/${imageId}/${IMAGE_VARIANTS.mid}`,
      small: `${baseUrl}/${imageId}/${IMAGE_VARIANTS.small}`
    };

    // Return success response with file information
    return new Response(JSON.stringify({
      success: true,
      id: imageId,
      uuid: uuid,
      filename: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: uploadResult.result.uploaded,
      variants: uploadResult.result.variants,
      urls: urls
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