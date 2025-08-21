import { execSync } from 'child_process';
import path from 'path';

export default async function globalSetup() {
  console.log('🚀 Starting E2E test setup...');
  const scriptPath = path.join(__dirname, 'setup.js');
  execSync(`node ${scriptPath}`, { stdio: 'inherit' });
}