// Test HeyGen API Key Validity
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const apiKey = process.env.HEYGEN_API_KEY;
console.log('Using API Key:', apiKey);
console.log('API Key Length:', apiKey.length);

async function testApiKey() {
  try {
    // Try a simple GET request to the HeyGen API
    const response = await fetch('https://api.heygen.com/v1/avatars', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', JSON.stringify(response.headers.raw()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HeyGen API Error:', errorText);
      console.error('Response Status:', response.status);
    } else {
      const data = await response.json();
      console.log('Success! API response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error testing API key:', error);
  }
}

// Run the test
testApiKey();
