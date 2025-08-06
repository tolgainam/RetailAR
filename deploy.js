#!/usr/bin/env node
/**
 * Manual deployment script for GitHub Pages
 * Run with: node deploy.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting manual deployment to GitHub Pages...');

try {
    // Build the project
    console.log('📦 Building project...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Check if dist directory exists
    const distPath = path.join(__dirname, 'dist');
    if (!fs.existsSync(distPath)) {
        throw new Error('Build failed - dist directory not found');
    }
    
    console.log('✅ Build completed successfully');
    
    // Deploy to gh-pages branch
    console.log('🚀 Deploying to GitHub Pages...');
    
    // Install gh-pages if not already installed
    try {
        require('gh-pages');
    } catch (err) {
        console.log('📦 Installing gh-pages...');
        execSync('npm install --save-dev gh-pages', { stdio: 'inherit' });
    }
    
    // Deploy
    const ghpages = require('gh-pages');
    
    ghpages.publish('dist', {
        branch: 'gh-pages',
        message: 'Deploy to GitHub Pages [skip ci]'
    }, (err) => {
        if (err) {
            console.error('❌ Deployment failed:', err);
            process.exit(1);
        } else {
            console.log('✅ Successfully deployed to GitHub Pages!');
            console.log('🌐 Your site will be available at: https://username.github.io/RetailAR/');
        }
    });
    
} catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
}