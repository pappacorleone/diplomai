// CommonJS format HeyGen test
const dotenv = require('dotenv');
const https = require('https');
const path = require('path');

// Load environment variables from parent directory
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

console.log('Starting basic HeyGen API test (CommonJS format)...');
console.log('API Key (first few chars):', HEYGEN_API_KEY?.substring(0, 5) + '...');
console.log('API Key length:', HEYGEN_API_KEY?.length);

function testHeyGenAPI() {
  console.log('Fetching avatar list from HeyGen API...');
  
  const options = {
    hostname: 'api.heygen.com',
    path: '/v1/avatar.list',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${HEYGEN_API_KEY}`
    }
  };
  
  const req = https.request(options, (res) => {
    console.log('Response status:', res.statusCode);
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response preview:', data.substring(0, 100) + '...');
      
      try {
        const jsonData = JSON.parse(data);
        console.log('Available avatars:', jsonData.data?.length || 0);
        if (jsonData.data && jsonData.data.length > 0) {
          console.log('First avatar ID:', jsonData.data[0].avatar_id || jsonData.data[0].id);
        }
      } catch (e) {
        console.log('Could not parse JSON response:', e.message);
      }
      
      console.log('Test completed!');
    });
  });
  
  req.on('error', (error) => {
    console.error('Error during HeyGen API test:', error.message);
  });
  
  req.end();
}

// Run the test
testHeyGenAPI();
