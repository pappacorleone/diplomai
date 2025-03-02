import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory .env
dotenv.config({ path: resolve(__dirname, '../.env') });

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

console.log('Starting HeyGen API test with node-fetch...');
console.log('API Key (first few chars):', HEYGEN_API_KEY?.substring(0, 5) + '...');
console.log('API Key length:', HEYGEN_API_KEY?.length);

async function testHeyGenAPI() {
  try {
    console.log('Fetching avatar list from HeyGen API...');
    
    const response = await fetch('https://api.heygen.com/v1/avatar.list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HEYGEN_API_KEY}`
      }
    });
    
    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', responseText.substring(0, 200) + '...');
    
    if (!response.ok) {
      throw new Error(`Failed to get avatar list: ${response.status}`);
    }
    
    try {
      const data = JSON.parse(responseText);
      console.log('Available avatars count:', data.data?.length || 0);
      if (data.data && data.data.length > 0) {
        console.log('First avatar ID:', data.data[0].avatar_id || data.data[0].id);
      }
    } catch (e) {
      console.log('Could not parse JSON response:', e);
    }
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error during HeyGen API test:', error);
  }
}

// Run the test
testHeyGenAPI();
