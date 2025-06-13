#!/usr/bin/env node

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    PROGRESS_FILE: './upload_progress.json',
    IMAGES_GEOJSON: './images.geojson',
    CLEANUP_LOG_FILE: './cleanup_log.json',
    FOLDERS_TO_CLEAN: ['images', 'mid_thumbs', 'small_thumbs']
};

class LocalFileCleanup {
    constructor() {
        this.uploadedFiles = {};
        this.cleanupLog = {
            deletedFiles: [],
            failedDeletions: [],
            skippedFiles: [],
            cleanupTime: null,
            totalFilesProcessed: 0,
            totalFilesDeleted: 0,
            totalFilesFailed: 0
        };
    }

    async loadUploadProgress() {
        try {
            if (!fsSync.existsSync(CONFIG.PROGRESS_FILE)) {
                throw new Error('Progress file not found. Please run upload script first.');
            }

            const data = await fs.readFile(CONFIG.PROGRESS_FILE, 'utf8');
            const progress = JSON.parse(data);
            
            this.uploadedFiles = progress.uploadedFiles || {};
            
            console.log(`📁 Loaded upload progress: ${Object.keys(this.uploadedFiles).length} uploaded files`);
            
            if (Object.keys(this.uploadedFiles).length === 0) {
                throw new Error('No uploaded files found in progress. Please complete uploads first.');
            }
            
        } catch (error) {
            console.error('❌ Error loading upload progress:', error.message);
            process.exit(1);
        }
    }

    async loadCleanupLog() {
        try {
            if (fsSync.existsSync(CONFIG.CLEANUP_LOG_FILE)) {
                const data = await fs.readFile(CONFIG.CLEANUP_LOG_FILE, 'utf8');
                this.cleanupLog = { ...this.cleanupLog, ...JSON.parse(data) };
                console.log(`📁 Loaded cleanup log: ${this.cleanupLog.deletedFiles.length} files already deleted`);
            }
        } catch (error) {
            console.warn('⚠️  Could not load cleanup log, starting fresh:', error.message);
        }
    }

    async saveCleanupLog() {
        try {
            await fs.writeFile(CONFIG.CLEANUP_LOG_FILE, JSON.stringify(this.cleanupLog, null, 2));
        } catch (error) {
            console.error('❌ Failed to save cleanup log:', error.message);
        }
    }

    async checkGeojsonUpdated() {
        try {
            const geojsonData = JSON.parse(await fs.readFile(CONFIG.IMAGES_GEOJSON, 'utf8'));
            
            // Check if any feature has been updated to use Cloudflare URLs
            const updatedFeatures = geojsonData.features.filter(feature => {
                return feature.properties.cloudflare_id || 
                       (feature.properties.path && feature.properties.path.includes('img.code4history.dev'));
            });

            if (updatedFeatures.length === 0) {
                throw new Error('images.geojson has not been updated with Cloudflare URLs. Please run update_images_geojson.js first.');
            }

            console.log(`✅ Found ${updatedFeatures.length} features with Cloudflare URLs in images.geojson`);
            return true;
            
        } catch (error) {
            console.error('❌ Error checking images.geojson:', error.message);
            return false;
        }
    }

    async deleteFile(filePath) {
        try {
            const fullPath = path.join(__dirname, filePath);
            
            // Check if file exists
            if (!fsSync.existsSync(fullPath)) {
                return { success: true, reason: 'already_missing' };
            }

            // Check if already deleted
            if (this.cleanupLog.deletedFiles.includes(filePath)) {
                return { success: true, reason: 'already_deleted' };
            }

            await fs.unlink(fullPath);
            return { success: true, reason: 'deleted' };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async cleanupFiles(dryRun = false) {
        this.cleanupLog.cleanupTime = new Date().toISOString();
        
        console.log(`${dryRun ? '🔍 DRY RUN:' : '🗑️'} Starting cleanup of local files...`);
        
        let processedCount = 0;
        let deletedCount = 0;
        let failedCount = 0;
        let skippedCount = 0;

        for (const [fid, uploadInfo] of Object.entries(this.uploadedFiles)) {
            console.log(`\n[${processedCount + 1}/${Object.keys(this.uploadedFiles).length}] Processing FID ${fid}:`);
            
            const originalPath = uploadInfo.originalPath;
            
            // Generate paths for all three folders
            const filesToDelete = [];
            
            // Original images path
            filesToDelete.push(originalPath);
            
            // Mid thumbs path
            const midThumbsPath = originalPath.replace('images/', 'mid_thumbs/');
            filesToDelete.push(midThumbsPath);
            
            // Small thumbs path
            const smallThumbsPath = originalPath.replace('images/', 'small_thumbs/');
            filesToDelete.push(smallThumbsPath);

            // Process each file
            for (const filePath of filesToDelete) {
                if (dryRun) {
                    const fullPath = path.join(__dirname, filePath);
                    if (fsSync.existsSync(fullPath)) {
                        console.log(`  📄 Would delete: ${filePath}`);
                    } else {
                        console.log(`  ⏭️  Already missing: ${filePath}`);
                    }
                } else {
                    const result = await this.deleteFile(filePath);
                    
                    if (result.success) {
                        if (result.reason === 'deleted') {
                            console.log(`  ✅ Deleted: ${filePath}`);
                            this.cleanupLog.deletedFiles.push(filePath);
                            deletedCount++;
                        } else if (result.reason === 'already_missing') {
                            console.log(`  ⏭️  Already missing: ${filePath}`);
                            this.cleanupLog.skippedFiles.push(filePath);
                            skippedCount++;
                        } else if (result.reason === 'already_deleted') {
                            console.log(`  ↪️  Already deleted: ${filePath}`);
                            skippedCount++;
                        }
                    } else {
                        console.log(`  ❌ Failed to delete: ${filePath} (${result.error})`);
                        this.cleanupLog.failedDeletions.push({
                            file: filePath,
                            error: result.error,
                            time: new Date().toISOString()
                        });
                        failedCount++;
                    }
                }
            }
            
            processedCount++;
            
            // Save progress periodically
            if (!dryRun && processedCount % 50 === 0) {
                await this.saveCleanupLog();
                console.log(`💾 Progress saved (${processedCount}/${Object.keys(this.uploadedFiles).length} processed)`);
            }
        }

        if (!dryRun) {
            this.cleanupLog.totalFilesProcessed = processedCount * 3; // 3 files per upload
            this.cleanupLog.totalFilesDeleted = deletedCount;
            this.cleanupLog.totalFilesFailed = failedCount;
            await this.saveCleanupLog();
        }

        console.log(`\n🎉 Cleanup ${dryRun ? 'preview' : 'process'} completed!`);
        console.log(`📊 Uploads processed: ${processedCount}`);
        console.log(`🗑️  Files ${dryRun ? 'would be' : ''} deleted: ${deletedCount}`);
        console.log(`⏭️  Files skipped: ${skippedCount}`);
        console.log(`❌ Failed deletions: ${failedCount}`);
        
        if (failedCount > 0 && !dryRun) {
            console.log('\n⚠️  Failed deletions:');
            this.cleanupLog.failedDeletions.slice(-10).forEach(failure => {
                console.log(`  ${failure.file}: ${failure.error}`);
            });
        }
    }

    async cleanupEmptyDirectories() {
        console.log('\n🗂️  Checking for empty directories...');
        
        for (const folderName of CONFIG.FOLDERS_TO_CLEAN) {
            const folderPath = path.join(__dirname, folderName);
            
            if (!fsSync.existsSync(folderPath)) {
                console.log(`⏭️  Folder doesn't exist: ${folderName}`);
                continue;
            }

            try {
                const entries = await fs.readdir(folderPath, { withFileTypes: true });
                const directories = entries.filter(entry => entry.isDirectory());
                
                let removedCount = 0;
                
                for (const dir of directories) {
                    const dirPath = path.join(folderPath, dir.name);
                    
                    try {
                        const files = await fs.readdir(dirPath);
                        
                        if (files.length === 0) {
                            await fs.rmdir(dirPath);
                            console.log(`🗑️  Removed empty directory: ${folderName}/${dir.name}`);
                            removedCount++;
                        }
                    } catch (error) {
                        console.log(`⚠️  Could not process directory ${folderName}/${dir.name}: ${error.message}`);
                    }
                }
                
                console.log(`📊 Removed ${removedCount} empty directories from ${folderName}`);
                
            } catch (error) {
                console.error(`❌ Error processing folder ${folderName}:`, error.message);
            }
        }
    }

    async showStatus() {
        console.log('\n📈 Cleanup Status:');
        console.log('==================');
        
        if (this.cleanupLog.cleanupTime) {
            console.log(`Last cleanup: ${this.cleanupLog.cleanupTime}`);
            console.log(`Files deleted: ${this.cleanupLog.deletedFiles.length}`);
            console.log(`Failed deletions: ${this.cleanupLog.failedDeletions.length}`);
            console.log(`Files skipped: ${this.cleanupLog.skippedFiles.length}`);
        } else {
            console.log('No cleanup has been performed yet.');
        }
        
        console.log(`\nUploaded files available for cleanup: ${Object.keys(this.uploadedFiles).length}`);
        console.log(`Total local files that could be cleaned: ${Object.keys(this.uploadedFiles).length * 3}`);
    }
}

// Main execution
async function main() {
    const command = process.argv[2];
    const cleanup = new LocalFileCleanup();
    
    await cleanup.loadUploadProgress();
    await cleanup.loadCleanupLog();
    
    switch (command) {
        case 'preview':
        case 'dry-run':
            if (await cleanup.checkGeojsonUpdated()) {
                await cleanup.cleanupFiles(true);
            }
            break;
        case 'cleanup':
        case 'delete':
            if (await cleanup.checkGeojsonUpdated()) {
                console.log('\n⚠️  WARNING: This will permanently delete local image files!');
                console.log('Make sure you have verified that:');
                console.log('1. All images were successfully uploaded to Cloudflare');
                console.log('2. images.geojson has been updated with new URLs');
                console.log('3. The application is working with the new URLs');
                console.log('\nType "YES" to confirm deletion:');
                
                // In a real implementation, you'd use readline for user input
                // For now, we'll require a confirmation flag
                if (process.argv[3] === '--confirm') {
                    await cleanup.cleanupFiles(false);
                    await cleanup.cleanupEmptyDirectories();
                } else {
                    console.log('❌ Deletion cancelled. Use --confirm flag to proceed.');
                    console.log('Example: node cleanup_local_files.js cleanup --confirm');
                }
            }
            break;
        case 'dirs':
        case 'directories':
            await cleanup.cleanupEmptyDirectories();
            break;
        case 'status':
            await cleanup.showStatus();
            break;
        default:
            console.log('Usage:');
            console.log('  node cleanup_local_files.js preview    - Show what files would be deleted');
            console.log('  node cleanup_local_files.js cleanup --confirm - Delete uploaded local files');
            console.log('  node cleanup_local_files.js dirs       - Remove empty directories');
            console.log('  node cleanup_local_files.js status     - Show cleanup status');
            console.log('');
            console.log('Note: Run this after uploading and updating images.geojson');
            console.log('⚠️  WARNING: This permanently deletes local files!');
            break;
    }
}

if (require.main === module) {
    main().catch(console.error);
}