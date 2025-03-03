// Test HeyGen API Endpoints
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const apiKey = process.env.HEYGEN_API_KEY;
console.log('Using API Key:', apiKey);

async function testEndpoint(endpoint, method = 'GET', body = null) {
  console.log(`Testing endpoint: ${endpoint} with method: ${method}`);
  
  try {
    const options = {
      method: method,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`https://api.heygen.com/v1/${endpoint}`, options);
    
    console.log(`${endpoint} - Response Status:`, response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${endpoint} - Error:`, errorText);
    } else {
      const data = await response.json();
      console.log(`${endpoint} - Success:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error(`${endpoint} - Request Error:`, error.message);
  }
  
  console.log('-'.repeat(50));
}

// Test a series of endpoints
async function runTests() {
  // Test various endpoints
  await testEndpoint('');
  await testEndpoint('avatar');
  await testEndpoint('avatars');
  await testEndpoint('streaming_avatar');
  await testEndpoint('streaming-avatar');
  
  // Test streaming avatar endpoints with POST
  const avatarData = {
    "avatar_id": "c5dcdad622bc4f33ac5e345ad2d5b73b",
    "voice_id": "c58182f3c66f4e24a24d51b53ac3e252",
    "background_color": "#ffffff",
    "stream_mode": "normal"
  };
  
  await testEndpoint('streaming_avatar/create-start', 'POST', avatarData);
  await testEndpoint('streaming-avatar/create-start', 'POST', avatarData);
}

// Run the tests
runTests();
