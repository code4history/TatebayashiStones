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

    // Handle GET requests for images - redirect to Cloudflare Images
    if (request.method === 'GET' && url.pathname !== '/') {
      return handleImageServing(url, env, corsHeaders);
    }

    // Default response for other cases
    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders 
    });
  }
};

/**
 * Handle image serving by reverse proxying to Cloudflare Images
 */
async function handleImageServing(url, env, corsHeaders) {
  // Extract project name, variant and UUID from the path
  // Expected format: /project/variant/uuid or /imageId/variant (legacy)
  const pathParts = url.pathname.substring(1).split('/');
  
  let imageId, variant;
  
  if (pathParts.length === 3) {
    // New format: /project/variant/uuid
    const [projectName, variantName, uuid] = pathParts;
    imageId = `${projectName}_${uuid}`;
    variant = variantName;
  } else if (pathParts.length === 2) {
    // Legacy format: /imageId/variant
    [imageId, variant] = pathParts;
  } else {
    return new Response('Invalid image path. Use: /project/variant/uuid or /imageId/variant', { 
      status: 400,
      headers: corsHeaders 
    });
  }
  
  // Validate variant
  const validVariants = ['public', 'mid', 'small'];
  if (!validVariants.includes(variant)) {
    return new Response('Invalid variant. Use: public, mid, or small', { 
      status: 400,
      headers: corsHeaders 
    });
  }
  
  // Fetch from Cloudflare Images URL
  const imageUrl = `https://imagedelivery.net/${env.IMAGES_ACCOUNT_HASH}/${imageId}/${variant}`;
  
  try {
    const imageResponse = await fetch(imageUrl);
    
    // Return the response with appropriate headers
    const headers = new Headers(imageResponse.headers);
    
    // Add CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
    
    return new Response(imageResponse.body, {
      status: imageResponse.status,
      headers: headers
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return new Response('Error fetching image', {
      status: 500,
      headers: corsHeaders
    });
  }
}

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

    // Get project name from query parameter
    const projectName = url.searchParams.get('project');
    if (!projectName) {
      return new Response('Project name is required. Add ?project=PROJECT_NAME to the URL', { 
        status: 400,
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
    const imageId = `${projectName}_${uuid}`;

    // Create form data for Cloudflare Images API
    const cfFormData = new FormData();
    cfFormData.append('file', file);
    cfFormData.append('id', imageId);
    
    // Optional: Add metadata
    cfFormData.append('metadata', JSON.stringify({
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      project: projectName
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
      const path = env.CUSTOM_IMAGES_PATH;
      if (path === '' || path === '/') {
        // 空のパスまたはルートパスの場合は直接イメージIDを付ける
        baseUrl = `https://${env.CUSTOM_IMAGES_DOMAIN}`;
      } else if (path === '/images') {
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
    
    // Generate URLs in both old and new formats
    const urls = {
      // Legacy format URLs
      original: `${baseUrl}/${imageId}/${IMAGE_VARIANTS.public}`,
      mid: `${baseUrl}/${imageId}/${IMAGE_VARIANTS.mid}`,
      small: `${baseUrl}/${imageId}/${IMAGE_VARIANTS.small}`,
      // New format URLs  
      originalNew: `${baseUrl}/${projectName}/${IMAGE_VARIANTS.public}/${uuid}`,
      midNew: `${baseUrl}/${projectName}/${IMAGE_VARIANTS.mid}/${uuid}`,
      smallNew: `${baseUrl}/${projectName}/${IMAGE_VARIANTS.small}/${uuid}`
    };

    // Return success response with file information
    return new Response(JSON.stringify({
      success: true,
      id: imageId,
      uuid: uuid,
      project: projectName,
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