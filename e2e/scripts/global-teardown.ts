import { execSync } from 'child_process';
import path from 'path';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up E2E test data...');
  const scriptPath = path.join(__dirname, 'cleanup.js');
  execSync(`node ${scriptPath}`, { stdio: 'inherit' });
}