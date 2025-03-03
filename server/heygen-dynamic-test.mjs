// Test with dynamic import
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createRequire } from 'module';

// Initialize dotenv
dotenv.config();

// Setup ES module equivalents for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Initialize express app
const app = express();
const PORT = 3001;

// Try dynamic import for HeyGen module
async function testHeyGenModule() {
  try {
    // Try dynamic import
    const heygenModule = await import('@heygen/streaming-avatar');
    console.log('Successfully imported HeyGen module');
    console.log('Available exports:', Object.keys(heygenModule));
    
    // Try to import using require
    const heygenRequire = require('@heygen/streaming-avatar');
    console.log('Successfully required HeyGen module');
    console.log('Required exports:', Object.keys(heygenRequire));
  } catch (error) {
    console.error('Error importing HeyGen module:', error.message);
  }
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'minimal-test')));

// Add a simple API route for testing
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
  
  // Test HeyGen module import
  await testHeyGenModule();
});
