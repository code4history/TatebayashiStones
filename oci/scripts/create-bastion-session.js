#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process').promises;
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// OCI CLI wrapper approach (simpler than SDK)
async function createBastionSession() {
    console.log('Creating OCI Bastion session...\n');
    
    // Check if OCI CLI is installed
    try {
        await exec('oci --version');
    } catch (error) {
        console.error('❌ OCI CLI is not installed');
        console.error('Please install: https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm');
        process.exit(1);
    }
    
    const sessionName = `tatebayashi-mysql-${Date.now()}`;
    const ttl = 10800; // 3 hours
    
    // Generate SSH key pair if not exists
    const sshKeyPath = process.env.SSH_PRIVATE_KEY_PATH || '~/.ssh/oci_bastion_key';
    const sshKeyPathExpanded = sshKeyPath.replace('~', process.env.HOME);
    const publicKeyPath = `${sshKeyPathExpanded}.pub`;
    
    try {
        await fs.access(sshKeyPathExpanded);
        console.log('✅ Using existing SSH key');
    } catch {
        console.log('Generating new SSH key pair...');
        await exec(`ssh-keygen -t rsa -b 4096 -f ${sshKeyPathExpanded} -N "" -C "bastion@tatebayashi"`);
        console.log('✅ SSH key pair generated');
    }
    
    // Read public key
    const publicKey = await fs.readFile(publicKeyPath, 'utf8');
    
    // Create session using OCI CLI
    const createCommand = `oci bastion session create \\
        --bastion-id ${process.env.OCI_BASTION_ID} \\
        --session-name "${sessionName}" \\
        --key-type "PUB" \\
        --ssh-public-key-file ${publicKeyPath} \\
        --target-resource-details '{
            "sessionType": "PORT_FORWARDING",
            "targetResourcePort": ${process.env.MYSQL_PORT},
            "targetResourcePrivateIpAddress": "${process.env.MYSQL_HOST}"
        }' \\
        --session-ttl-in-seconds ${ttl} \\
        --wait-for-state SUCCEEDED`;
    
    console.log('Creating Bastion session...');
    
    try {
        const { stdout } = await exec(createCommand);
        const session = JSON.parse(stdout);
        
        // Extract connection details
        const sessionInfo = {
            sessionId: session.data.id,
            sessionName: session.data['display-name'],
            username: session.data['bastion-user-name'],
            bastionHost: session.data['bastion-name'] + '.bastion.' + process.env.OCI_REGION + '.oci.oraclecloud.com',
            sshCommand: `ssh -i ${sshKeyPath} -N -L ${process.env.LOCAL_MYSQL_PORT}:${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT} -p 22 ${session.data['bastion-user-name']}@${session.data['bastion-name']}.bastion.${process.env.OCI_REGION}.oci.oraclecloud.com`,
            expiresAt: new Date(Date.now() + ttl * 1000).toISOString()
        };
        
        // Save session info
        await fs.writeFile(
            path.join(__dirname, '../.session-info.json'),
            JSON.stringify(sessionInfo, null, 2)
        );
        
        // Update .env with new session details
        console.log('\n✅ Bastion session created successfully!');
        console.log('\nSession Details:');
        console.log(`  Session ID: ${sessionInfo.sessionId}`);
        console.log(`  Username: ${sessionInfo.username}`);
        console.log(`  Expires: ${sessionInfo.expiresAt}`);
        console.log('\nTo connect, run:');
        console.log('  npm run connect\n');
        
        // Optionally update .env
        console.log('💡 Add these to your .env file:');
        console.log(`OCI_BASTION_SESSION_ID=${sessionInfo.sessionId}`);
        console.log(`OCI_BASTION_USERNAME=${sessionInfo.username}`);
        console.log(`OCI_BASTION_HOST=${sessionInfo.bastionHost}`);
        
    } catch (error) {
        console.error('❌ Failed to create session:', error.message);
        process.exit(1);
    }
}

// Cleanup old sessions
async function cleanupOldSessions() {
    console.log('\nCleaning up old sessions...');
    
    try {
        const { stdout } = await exec(`oci bastion session list --bastion-id ${process.env.OCI_BASTION_ID} --all`);
        const sessions = JSON.parse(stdout);
        
        const oldSessions = sessions.data.filter(s => 
            s['display-name'].startsWith('tatebayashi-mysql-') && 
            s['lifecycle-state'] === 'ACTIVE'
        );
        
        for (const session of oldSessions) {
            console.log(`Deleting old session: ${session['display-name']}`);
            await exec(`oci bastion session delete --session-id ${session.id} --force`);
        }
        
    } catch (error) {
        console.warn('Warning: Could not cleanup old sessions');
    }
}

// Main execution
async function main() {
    // Check required environment variables
    const required = ['OCI_BASTION_ID', 'MYSQL_HOST', 'MYSQL_PORT', 'OCI_REGION'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:', missing.join(', '));
        console.error('Please check your .env file');
        process.exit(1);
    }
    
    // Cleanup and create new session
    await cleanupOldSessions();
    await createBastionSession();
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});