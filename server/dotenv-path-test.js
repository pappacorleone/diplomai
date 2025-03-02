// Test with dotenv import and explicit path
import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const parentDir = resolve(__dirname, '..');

console.log('Starting dotenv path test');
console.log('Current directory:', __dirname);
console.log('Parent directory:', parentDir);

// Check if .env file exists
const envPath = resolve(parentDir, '.env');
console.log('.env path:', envPath);
console.log('.env exists:', fs.existsSync(envPath));

// Load from parent directory
dotenv.config({ path: envPath });
console.log('Environment loaded');
console.log('HEYGEN_API_KEY exists:', !!process.env.HEYGEN_API_KEY);
console.log('HEYGEN_API_KEY (first 5 chars):', process.env.HEYGEN_API_KEY ? process.env.HEYGEN_API_KEY.substring(0, 5) : 'not found');
console.log('Test completed successfully');
