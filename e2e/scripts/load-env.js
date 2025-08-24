#!/usr/bin/env node
/**
 * Load environment variables from .env.playwright
 * This ensures Node.js Playwright uses separate browser cache from Python
 */

const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env.playwright');

if (fs.existsSync(envFile)) {
  console.log('Loading Playwright environment configuration...');
  
  const content = fs.readFileSync(envFile, 'utf8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      let cleanLine = trimmed.replace(/^export\s+/, '');
      
      if (cleanLine.includes('=')) {
        const [key, ...valueParts] = cleanLine.split('=');
        let value = valueParts.join('=').replace(/^"(.*)"$/, '$1');
        
        // Expand ${HOME} variable
        if (value.includes('${HOME}')) {
          value = value.replace('${HOME}', process.env.HOME || process.env.USERPROFILE);
        }
        
        process.env[key] = value;
        console.log(`  ${key}=${value}`);
      }
    }
  }
  
  console.log('Environment configuration loaded successfully');
} else {
  console.log('Warning: .env.playwright not found, using default configuration');
  // Set default configuration
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(process.env.HOME, '.cache', 'playwright-node');
}