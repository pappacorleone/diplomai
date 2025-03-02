// Minimal test with ES module import
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

console.log('Starting minimal ES module test');
console.log('Current directory:', process.cwd());
console.log('Node version:', process.version);
console.log('Test completed successfully');
