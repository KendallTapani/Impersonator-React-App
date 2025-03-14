const http = require('http');

console.log('Testing connection to backend server...');

// Try to connect to the backend server
const req = http.request({
  host: 'localhost',
  port: 3001,
  path: '/health',
  method: 'GET',
  timeout: 2000
}, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('\x1b[32m%s\x1b[0m', '✓ Successfully connected to backend server!');
      console.log('Response:', response);
      console.log('\nYou can now run the following command to start both servers:');
      console.log('\x1b[36m%s\x1b[0m', 'npm run dev:full');
      process.exit(0);
    } catch (e) {
      console.error('\x1b[31m%s\x1b[0m', '✗ Error parsing backend response');
      console.error(e);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('\x1b[31m%s\x1b[0m', '✗ Failed to connect to backend server!');
  console.error(`Error: ${err.message}`);
  console.error('\nPlease make sure the backend server is running on port 3001:');
  console.error('\x1b[36m%s\x1b[0m', 'cd backend && npm run dev');
  console.error('\nIf you haven\'t installed backend dependencies yet, run:');
  console.error('\x1b[36m%s\x1b[0m', 'cd backend && npm install');
  process.exit(1);
});

req.on('timeout', () => {
  console.error('\x1b[31m%s\x1b[0m', '✗ Connection to backend server timed out!');
  console.error('\nPlease make sure the backend server is running on port 3001:');
  console.error('\x1b[36m%s\x1b[0m', 'cd backend && npm run dev');
  req.destroy();
  process.exit(1);
});

req.end(); 