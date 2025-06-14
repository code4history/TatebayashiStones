#!/usr/bin/env node

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
    host: 'localhost',
    port: process.env.LOCAL_MYSQL_PORT || 3307,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    multipleStatements: true
};

async function initDatabase() {
    let connection;
    
    try {
        console.log('Connecting to MySQL...');
        connection = await mysql.createConnection(dbConfig);
        
        // Create database if not exists
        console.log('Creating database if not exists...');
        await connection.execute(
            `CREATE DATABASE IF NOT EXISTS ${process.env.MYSQL_DATABASE} 
             CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        
        // Use the database
        await connection.execute(`USE ${process.env.MYSQL_DATABASE}`);
        
        // Create monuments table
        console.log('Creating monuments table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS monuments (
                id INT PRIMARY KEY,
                name VARCHAR(255),
                name_kana VARCHAR(255),
                type VARCHAR(100) NOT NULL,
                subtype VARCHAR(100),
                era VARCHAR(100),
                year_built VARCHAR(100),
                material VARCHAR(100),
                height_cm INT,
                width_cm INT,
                depth_cm INT,
                inscription TEXT,
                location_description TEXT,
                oaza VARCHAR(100),
                koaza VARCHAR(100),
                address VARCHAR(255),
                latitude DECIMAL(10, 8) NOT NULL,
                longitude DECIMAL(11, 8) NOT NULL,
                location POINT NOT NULL,
                survey_date DATE,
                surveyor VARCHAR(100),
                notes TEXT,
                condition_status VARCHAR(50),
                is_missing BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                SPATIAL INDEX(location),
                INDEX idx_type (type),
                INDEX idx_oaza (oaza),
                INDEX idx_era (era)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // Create images table
        console.log('Creating images table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS images (
                id INT AUTO_INCREMENT PRIMARY KEY,
                monument_id INT NOT NULL,
                filename VARCHAR(255) NOT NULL,
                cloudflare_id VARCHAR(255),
                url TEXT,
                thumbnail_url TEXT,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_primary BOOLEAN DEFAULT FALSE,
                caption TEXT,
                photographer VARCHAR(100),
                FOREIGN KEY (monument_id) REFERENCES monuments(id) ON DELETE CASCADE,
                INDEX idx_monument (monument_id),
                INDEX idx_cloudflare (cloudflare_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // Create areas table for oaza boundaries
        console.log('Creating areas table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS areas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                oaza VARCHAR(100) UNIQUE NOT NULL,
                koaza VARCHAR(100),
                boundary GEOMETRY NOT NULL,
                area_sqm DECIMAL(15, 2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                SPATIAL INDEX(boundary),
                INDEX idx_oaza (oaza)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // Create survey_books table
        console.log('Creating survey_books table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS survey_books (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                volume_number INT,
                page_range VARCHAR(50),
                scan_url TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // Create monument_book_references junction table
        console.log('Creating monument_book_references table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS monument_book_references (
                monument_id INT NOT NULL,
                book_id INT NOT NULL,
                page_number INT,
                PRIMARY KEY (monument_id, book_id),
                FOREIGN KEY (monument_id) REFERENCES monuments(id) ON DELETE CASCADE,
                FOREIGN KEY (book_id) REFERENCES survey_books(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // Create user_reports table for crowdsourced updates
        console.log('Creating user_reports table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                monument_id INT NOT NULL,
                report_type ENUM('condition', 'location', 'missing', 'found', 'other') NOT NULL,
                description TEXT NOT NULL,
                reporter_name VARCHAR(100),
                reporter_contact VARCHAR(255),
                status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                verified_at TIMESTAMP NULL,
                verified_by VARCHAR(100),
                FOREIGN KEY (monument_id) REFERENCES monuments(id) ON DELETE CASCADE,
                INDEX idx_monument_status (monument_id, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        console.log('✅ Database initialization completed successfully!');
        
        // Show created tables
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('\nCreated tables:');
        tables.forEach(table => {
            console.log(`  - ${Object.values(table)[0]}`);
        });
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run initialization
initDatabase().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});