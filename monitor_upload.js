#!/usr/bin/env node

const fs = require('fs');

function readProgress() {
    try {
        if (!fs.existsSync('./upload_progress.json')) {
            return null;
        }
        
        const data = fs.readFileSync('./upload_progress.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return null;
    }
}

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else {
        return `${minutes}m`;
    }
}

function showProgress() {
    const progress = readProgress();
    
    if (!progress) {
        console.log('❌ No progress file found');
        return;
    }
    
    const completed = progress.completed ? progress.completed.length : 0;
    const failed = progress.failed ? progress.failed.length : 0;
    const total = progress.totalFiles || 2577;
    const remaining = total - completed;
    const percentage = ((completed / total) * 100).toFixed(1);
    
    console.log('\n📊 Upload Progress Report');
    console.log('========================');
    console.log(`✅ Completed: ${completed}/${total} (${percentage}%)`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏳ Remaining: ${remaining}`);
    
    if (progress.startTime) {
        const startTime = new Date(progress.startTime);
        const now = new Date();
        const elapsed = now - startTime;
        console.log(`⏱️  Elapsed: ${formatTime(elapsed)}`);
        
        if (completed > 0) {
            const avgTimePerFile = elapsed / completed;
            const estimatedRemaining = remaining * avgTimePerFile;
            console.log(`🔮 Estimated remaining: ${formatTime(estimatedRemaining)}`);
        }
    }
    
    if (progress.lastSaveTime) {
        const lastSave = new Date(progress.lastSaveTime);
        const timeSinceLastSave = new Date() - lastSave;
        console.log(`💾 Last saved: ${formatTime(timeSinceLastSave)} ago`);
    }
    
    // Show recent failures if any
    if (failed > 0) {
        console.log('\n⚠️  Recent failures:');
        const failedIds = Array.from(progress.failed || []).slice(-5);
        failedIds.forEach(id => console.log(`   FID: ${id}`));
    }
    
    console.log('');
}

// Show progress and exit, or monitor continuously
const monitor = process.argv[2] === 'watch';

if (monitor) {
    console.log('🔍 Monitoring upload progress (Ctrl+C to stop)...\n');
    
    // Show progress every 30 seconds
    setInterval(() => {
        console.clear();
        showProgress();
    }, 30000);
    
    // Show initial progress
    showProgress();
} else {
    showProgress();
}