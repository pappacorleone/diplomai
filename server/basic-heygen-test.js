import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

console.log('Starting basic HeyGen API test...');
console.log('API Key (first few chars):', HEYGEN_API_KEY?.substring(0, 5) + '...');

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
    console.log('Response:', responseText);
    
    if (!response.ok) {
      throw new Error(`Failed to get avatar list: ${response.status}`);
    }
    
    try {
      const data = JSON.parse(responseText);
      console.log('Available avatars:', data.data?.length || 0);
    } catch (e) {
      console.log('Could not parse JSON response');
    }
    
    console.log('Test completed!');
  } catch (error) {
    console.error('Error during HeyGen API test:', error);
  }
}

// Run the test
testHeyGenAPI();
