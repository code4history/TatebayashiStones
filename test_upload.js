#!/usr/bin/env node

require('dotenv').config();

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Configuration
const CONFIG = {
    CLOUDFLARE_ACCOUNT_ID: '61f248de47f07bdbf3dd2133a5378e64',
    CLOUDFLARE_IMAGES_URL: 'https://api.cloudflare.com/client/v4/accounts/61f248de47f07bdbf3dd2133a5378e64/images/v1',
    CUSTOM_IMAGES_DOMAIN: 'img.code4history.dev',
    PROJECT_PREFIX: 'tatebayashi_stones',
    TEST_COUNT: 5 // Only upload first 5 files for testing
};

const AUTH_TOKEN = process.env.CLOUDFLARE_IMAGES_API_TOKEN;

async function testUpload() {
    console.log('🧪 Starting test upload of first 5 files...');
    
    if (!AUTH_TOKEN) {
        console.error('❌ CLOUDFLARE_IMAGES_API_TOKEN not found');
        return;
    }

    try {
        // Load images.geojson
        const imagesGeojson = JSON.parse(await fs.readFile('images.geojson', 'utf8'));
        const testFeatures = imagesGeojson.features.slice(0, CONFIG.TEST_COUNT);
        
        console.log(`📋 Testing with ${testFeatures.length} files`);

        for (let i = 0; i < testFeatures.length; i++) {
            const feature = testFeatures[i];
            const fid = feature.properties.fid;
            const filePath = feature.properties.path;
            
            console.log(`\n[${i + 1}/${testFeatures.length}] Testing FID ${fid}: ${filePath}`);
            
            // Clean path
            const cleanPath = filePath.startsWith('./') ? filePath.substring(2) : filePath;
            const fullPath = path.join(__dirname, cleanPath);
            
            if (!fsSync.existsSync(fullPath)) {
                console.log(`❌ File not found: ${cleanPath}`);
                continue;
            }
            
            try {
                // Read file
                const fileBuffer = await fs.readFile(fullPath);
                const fileName = path.basename(cleanPath);
                
                // Create form data
                const formData = new FormData();
                formData.append('file', fileBuffer, fileName);
                formData.append('id', `${CONFIG.PROJECT_PREFIX}_test_${fid}_${Date.now()}`);

                console.log(`📤 Uploading ${fileName} (${Math.round(fileBuffer.length / 1024)}KB)...`);

                // Upload to Cloudflare Images
                const response = await axios.post(CONFIG.CLOUDFLARE_IMAGES_URL, formData, {
                    headers: {
                        'Authorization': `Bearer ${AUTH_TOKEN}`,
                        ...formData.getHeaders()
                    },
                    timeout: 120000, // 2 minute timeout
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                });

                const result = response.data;
                
                if (result.success) {
                    const imageId = result.result.id;
                    console.log(`✅ Success! Image ID: ${imageId}`);
                    console.log(`🔗 URL: https://${CONFIG.CUSTOM_IMAGES_DOMAIN}/${imageId}/public`);
                } else {
                    console.log(`❌ Upload failed: ${JSON.stringify(result.errors)}`);
                }
                
            } catch (error) {
                console.log(`❌ Error uploading: ${error.message}`);
                if (error.response) {
                    console.log(`HTTP ${error.response.status}: ${error.response.statusText}`);
                }
            }
            
            // Wait 2 seconds between uploads
            if (i < testFeatures.length - 1) {
                console.log('⏳ Waiting 2 seconds...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.log('\n🎉 Test upload completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testUpload();