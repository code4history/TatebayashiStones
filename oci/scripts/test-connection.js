#!/usr/bin/env node

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function testConnection() {
    console.log('Testing MySQL connection through Bastion tunnel...\n');
    
    const config = {
        host: 'localhost',
        port: process.env.LOCAL_MYSQL_PORT || 3307,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
    };
    
    console.log('Connection config:');
    console.log(`  Host: ${config.host}:${config.port}`);
    console.log(`  User: ${config.user}`);
    console.log(`  Database: ${config.database}\n`);
    
    try {
        const connection = await mysql.createConnection(config);
        console.log('✅ Successfully connected to MySQL!');
        
        // Test query
        const [rows] = await connection.execute('SELECT VERSION() as version');
        console.log(`MySQL Version: ${rows[0].version}`);
        
        // Check HeatWave status
        try {
            const [hwStatus] = await connection.execute("SHOW STATUS LIKE 'rapid_%'");
            if (hwStatus.length > 0) {
                console.log('\nHeatWave Status:');
                hwStatus.forEach(row => {
                    console.log(`  ${row.Variable_name}: ${row.Value}`);
                });
            }
        } catch (e) {
            console.log('\nHeatWave status not available');
        }
        
        await connection.end();
        console.log('\n✅ Connection test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Connection failed:', error.message);
        console.error('\nPlease check:');
        console.error('1. SSH tunnel is running (run connect-mysql.sh first)');
        console.error('2. Environment variables are correctly set in .env');
        console.error('3. MySQL credentials are correct');
        process.exit(1);
    }
}

// Check if tunnel is likely running
const net = require('net');
const port = process.env.LOCAL_MYSQL_PORT || 3307;

const server = net.createServer();
server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        // Port is in use, likely tunnel is running
        testConnection();
    } else {
        console.error(`❌ Port ${port} is not accessible`);
        console.error('Please run ./scripts/connect-mysql.sh first to establish the tunnel');
        process.exit(1);
    }
});

server.once('listening', () => {
    server.close();
    console.error(`❌ Port ${port} is not in use`);
    console.error('Please run ./scripts/connect-mysql.sh first to establish the tunnel');
    process.exit(1);
});

server.listen(port);