// Server starter script for testing HeyGen integration
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure our .env is properly loaded
const envPath = join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found at:', envPath);
  process.exit(1);
}

// Start the server
console.log('Starting server with HeyGen integration...');
console.log('Server will be available at http://localhost:3001');
console.log('Minimal test can be accessed at: file://' + join(__dirname, '../minimal-test/heygen-minimal.html'));

// Print HeyGen API key status (first few chars only for security)
const envContent = fs.readFileSync(envPath, 'utf8');
const heygenMatch = envContent.match(/HEYGEN_API_KEY=(.+)/);
if (heygenMatch && heygenMatch[1]) {
  const apiKey = heygenMatch[1];
  const maskedKey = apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 3);
  console.log('HeyGen API Key found:', maskedKey);
  console.log('API Key length:', apiKey.length);
} else {
  console.error('Warning: No HeyGen API key found in .env file');
}

// Start the server
const serverProcess = exec('node index.js', { cwd: __dirname });

serverProcess.stdout.on('data', (data) => {
  console.log(`Server: ${data}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`Server Error: ${data}`);
});

serverProcess.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Handle program exit
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  serverProcess.kill();
  process.exit(0);
});
