// Test with dotenv import
import dotenv from 'dotenv';

console.log('Starting dotenv test');
dotenv.config();
console.log('Environment loaded');
console.log('HEYGEN_API_KEY exists:', !!process.env.HEYGEN_API_KEY);
console.log('Test completed successfully');
