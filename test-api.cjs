const http = require('http');

// List of endpoints to test
const endpoints = [
  { path: '/health', name: 'Root Health Check' },
  { path: '/api/health', name: 'API Health Check' },
  { path: '/api/test', name: 'API Test Endpoint' }
];

console.log('Testing direct API connectivity to backend server...\n');

// Test each endpoint
endpoints.forEach(endpoint => {
  console.log(`Testing endpoint: ${endpoint.name} (${endpoint.path})`);
  
  const req = http.request({
    host: 'localhost',
    port: 3001,
    path: endpoint.path,
    method: 'GET',
    timeout: 2000
  }, (res) => {
    console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('Response:', response);
      } catch (e) {
        console.error('Error parsing response:', e.message);
        console.log('Raw response:', data);
      }
      console.log('----------------------------');
    });
  });
  
  req.on('error', (err) => {
    console.error(`Error for ${endpoint.path}: ${err.message}`);
    console.log('----------------------------');
  });
  
  req.on('timeout', () => {
    console.error(`Timeout for ${endpoint.path}`);
    req.destroy();
    console.log('----------------------------');
  });
  
  req.end();
});

console.log('All tests initiated. Waiting for responses...'); 