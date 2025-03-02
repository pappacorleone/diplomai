import { StreamingAvatar, TaskType } from '@heygen/streaming-avatar';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Starting HeyGen API test...');
console.log('API Key (first few chars):', process.env.HEYGEN_API_KEY?.substring(0, 5) + '...');
console.log('Environment variables:', {
  PORT: process.env.PORT,
  CLIENT_URL: process.env.CLIENT_URL,
  HEYGEN_API_KEY_LENGTH: process.env.HEYGEN_API_KEY?.length || 'not set',
  GEMINI_API_KEY_SET: !!process.env.GEMINI_API_KEY
});

async function testHeyGenAPI() {
  try {
    // Get available avatars first
    console.log('Getting avatar list...');
    
    const response = await fetch('https://api.heygen.com/v1/avatar.list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HEYGEN_API_KEY}`
      }
    });
    
    if (!response.ok) {
      console.error('Failed to get avatar list:', response.status, response.statusText);
      const responseText = await response.text();
      console.error('Response:', responseText);
      throw new Error(`Failed to get avatar list: ${response.status}`);
    }
    
    const avatarData = await response.json();
    console.log('Available avatars:', avatarData.data?.map(a => a.avatar_id || a.id));
    
    // Use first available avatar_id or fallback to trump_45
    const avatarId = (avatarData.data && avatarData.data.length > 0) 
      ? (avatarData.data[0].avatar_id || avatarData.data[0].id) 
      : 'trump_45';
    
    console.log('Using avatar ID:', avatarId);
    
    // Create StreamingAvatar instance
    console.log('Creating StreamingAvatar instance...');
    const avatarClient = new StreamingAvatar({
      token: process.env.HEYGEN_API_KEY
    });
    
    console.log('Attempting to create and start avatar session...');
    
    // Create and start a session
    const sessionData = await avatarClient.createStartAvatar({
      avatarName: avatarId,
      quality: 'standard'
    });
    
    console.log('Session created successfully!');
    console.log('Session ID:', sessionData.session_id);
    console.log('LiveKit info:', JSON.stringify(sessionData.livekit_info, null, 2));
    
    // Try sending a simple message
    console.log('Attempting to make avatar speak...');
    const result = await avatarClient.speak({
      sessionId: sessionData.session_id,
      text: 'Hello, this is a test from Donald Trump. I make the best tests, believe me.',
      task_type: TaskType.REPEAT
    });
    
    console.log('Speak command succeeded:', result);
    
    // Wait 10 seconds for the avatar to finish speaking
    console.log('Waiting 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // End the session
    console.log('Ending session...');
    await avatarClient.endSession({ sessionId: sessionData.session_id });
    
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Error during HeyGen API test:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testHeyGenAPI().catch(err => {
  console.error('Unhandled error in test:', err);
}).finally(() => {
  console.log('Test script execution completed.');
});
