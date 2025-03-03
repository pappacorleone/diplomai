// HeyGen module test using correct ES module syntax
import * as heygenModule from '@heygen/streaming-avatar';
import { createRequire } from 'module';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

// Setup ES module equivalents for __dirname and require
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Print available exports from heygen module
console.log('Available exports from @heygen/streaming-avatar:');
console.log(Object.keys(heygenModule));

// Initialize express app
const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'minimal-test')));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
