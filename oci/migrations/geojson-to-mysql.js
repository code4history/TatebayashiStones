#!/usr/bin/env node

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
    host: 'localhost',
    port: process.env.LOCAL_MYSQL_PORT || 3307,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
};

// Monument type mapping
const typeMapping = {
    'jizo': '地蔵',
    'koshin': '庚申塔',
    'bato': '馬頭観音',
    'dosojin': '道祖神',
    'nyoirin': '如意輪観音',
    'fujiko': '富士講',
    'tsukimachi': '月待塔',
    'shomen': '青面金剛',
    'gorinto': '五輪塔',
    'hokyoin': '宝篋印塔',
    'itahi': '板碑',
    'kuyohi': '供養碑',
    'chukonhi': '忠魂碑',
    'kinenhi': '記念碑',
    'hokora': '祠',
    'shrine': '神社',
    'mount': '塚',
    'dohyo': '土俵'
};

async function migrateData() {
    let connection;
    
    try {
        console.log('Connecting to MySQL...');
        connection = await mysql.createConnection(dbConfig);
        
        // Load GeoJSON files
        console.log('\nLoading GeoJSON files...');
        const monumentsData = JSON.parse(
            await fs.readFile(path.join(__dirname, '../../tatebayashi_stones.geojson'), 'utf8')
        );
        const areasData = JSON.parse(
            await fs.readFile(path.join(__dirname, '../../area.geojson'), 'utf8')
        );
        const imagesData = JSON.parse(
            await fs.readFile(path.join(__dirname, '../../images.geojson'), 'utf8')
        );
        
        console.log(`Found ${monumentsData.features.length} monuments`);
        console.log(`Found ${areasData.features.length} areas`);
        console.log(`Found ${imagesData.features.length} images`);
        
        // Start transaction
        await connection.beginTransaction();
        
        try {
            // Migrate areas
            console.log('\n📍 Migrating areas...');
            for (const feature of areasData.features) {
                const props = feature.properties;
                const geometry = JSON.stringify(feature.geometry);
                
                await connection.execute(
                    `INSERT INTO areas (oaza, boundary) 
                     VALUES (?, ST_GeomFromGeoJSON(?))
                     ON DUPLICATE KEY UPDATE boundary = VALUES(boundary)`,
                    [props.S_NAME || props.name, geometry]
                );
            }
            console.log('✅ Areas migrated successfully');
            
            // Migrate monuments
            console.log('\n🗿 Migrating monuments...');
            let monumentCount = 0;
            
            for (const feature of monumentsData.features) {
                const props = feature.properties;
                const coords = feature.geometry.coordinates;
                
                // Map type from English to Japanese if needed
                const monumentType = typeMapping[props.type] || props.type || 'その他';
                
                await connection.execute(
                    `INSERT INTO monuments (
                        id, name, type, subtype, era, year_built,
                        material, height_cm, inscription,
                        location_description, oaza, koaza, address,
                        latitude, longitude, location,
                        survey_date, surveyor, notes, is_missing
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, POINT(?, ?),
                        ?, ?, ?, ?
                    ) ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        type = VALUES(type),
                        updated_at = CURRENT_TIMESTAMP`,
                    [
                        props.id,
                        props.name || null,
                        monumentType,
                        props.subtype || null,
                        props.era || null,
                        props.year || null,
                        props.material || null,
                        props.height || null,
                        props.inscription || null,
                        props.location || null,
                        props.oaza || null,
                        props.koaza || null,
                        props.address || null,
                        coords[1], // latitude
                        coords[0], // longitude
                        coords[0], // longitude for POINT
                        coords[1], // latitude for POINT
                        props.survey_date || null,
                        props.surveyor || null,
                        props.notes || null,
                        props.missing || false
                    ]
                );
                
                monumentCount++;
                if (monumentCount % 100 === 0) {
                    console.log(`  Processed ${monumentCount} monuments...`);
                }
            }
            console.log(`✅ ${monumentCount} monuments migrated successfully`);
            
            // Migrate images
            console.log('\n📸 Migrating images...');
            let imageCount = 0;
            
            for (const feature of imagesData.features) {
                const props = feature.properties;
                
                // Extract monument ID from path or properties
                let monumentId = props.monument_id;
                if (!monumentId && props.path) {
                    const match = props.path.match(/images\/(\d+)\//);
                    if (match) {
                        monumentId = parseInt(match[1]);
                    }
                }
                
                if (monumentId) {
                    await connection.execute(
                        `INSERT INTO images (
                            monument_id, filename, cloudflare_id, 
                            url, thumbnail_url, caption
                        ) VALUES (?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            url = VALUES(url),
                            thumbnail_url = VALUES(thumbnail_url)`,
                        [
                            monumentId,
                            props.filename || path.basename(props.path || ''),
                            props.cloudflare_id || null,
                            props.url || props.path || null,
                            props.thumbnail_url || null,
                            props.caption || null
                        ]
                    );
                    
                    imageCount++;
                }
            }
            console.log(`✅ ${imageCount} images migrated successfully`);
            
            // Commit transaction
            await connection.commit();
            console.log('\n✅ All data migrated successfully!');
            
            // Show summary
            const [[monumentStats]] = await connection.execute(
                'SELECT COUNT(*) as total, COUNT(DISTINCT type) as types FROM monuments'
            );
            const [[imageStats]] = await connection.execute(
                'SELECT COUNT(*) as total, COUNT(DISTINCT monument_id) as monuments_with_images FROM images'
            );
            
            console.log('\n📊 Migration Summary:');
            console.log(`  Total monuments: ${monumentStats.total}`);
            console.log(`  Monument types: ${monumentStats.types}`);
            console.log(`  Total images: ${imageStats.total}`);
            console.log(`  Monuments with images: ${imageStats.monuments_with_images}`);
            
        } catch (error) {
            await connection.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run migration
migrateData().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});