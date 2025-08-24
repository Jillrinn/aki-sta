#!/usr/bin/env node
/**
 * Playwright environment-aware browser installer
 * Checks for browsers in the configured cache directory and installs if needed
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔍 Checking Playwright browsers with environment isolation...');

// Load environment configuration first
require('./load-env.js');

try {
  // Get configured browser cache directory
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const browserCachePath = process.env.PLAYWRIGHT_BROWSERS_PATH || 
                          path.join(homeDir, '.cache', 'ms-playwright');
  
  console.log(`Using browser cache: ${browserCachePath}`);
  
  // Ensure cache directory exists
  if (!fs.existsSync(browserCachePath)) {
    console.log('📁 Creating browser cache directory...');
    fs.mkdirSync(browserCachePath, { recursive: true });
  }
  
  // Check if browsers exist by trying to run playwright list
  let needsInstall = false;
  
  try {
    const output = execSync('npx playwright list', { 
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // Check if any browsers are available
    const hasAnyBrowser = output.includes('webkit') || 
                         output.includes('chromium') || 
                         output.includes('firefox');
    
    if (!hasAnyBrowser) {
      console.log('❌ No Playwright browsers found in output');
      needsInstall = true;
    } else {
      console.log('✅ Playwright browsers detected');
    }
  } catch (listError) {
    console.log('❌ Unable to list Playwright browsers, installation needed');
    needsInstall = true;
  }
  
  // Additional check: look for browser executables in the cache directory
  if (!needsInstall) {
    try {
      const files = fs.existsSync(browserCachePath) ? fs.readdirSync(browserCachePath) : [];
      const hasExecutables = files.some(file => 
        file.includes('webkit') || 
        file.includes('chromium') || 
        file.includes('firefox')
      );
      
      if (!hasExecutables) {
        console.log('❌ No browser executables found in cache directory');
        needsInstall = true;
      }
    } catch (error) {
      console.log('⚠️  Unable to check cache directory, installing browsers to be safe');
      needsInstall = true;
    }
  }
  
  if (needsInstall) {
    console.log('📦 Installing Playwright browsers with environment isolation...');
    console.log(`Cache directory: ${browserCachePath}`);
    
    // Install with dependencies for better compatibility
    execSync('npx playwright install --with-deps', { 
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      env: process.env
    });
    console.log('✅ Playwright browsers installed successfully');
  } else {
    console.log('✅ Playwright browsers already available');
  }
  
  // Final verification
  console.log('🔍 Verifying browser installation...');
  const verifyOutput = execSync('npx playwright --version', { 
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    env: process.env
  });
  console.log(`✅ Playwright version: ${verifyOutput.trim()}`);
  
} catch (error) {
  console.error('❌ Error during browser setup:', error.message);
  
  // Last resort: force installation
  console.log('🔧 Force installing Playwright browsers...');
  try {
    execSync('npx playwright install --with-deps --force', { 
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      env: process.env
    });
    console.log('✅ Playwright browsers force-installed successfully');
  } catch (installError) {
    console.error('❌ Failed to install Playwright browsers:', installError.message);
    console.error('Please try running the project setup script: ../setup-playwright-environments.sh');
    process.exit(1);
  }
}