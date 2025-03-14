// Test route to verify API connectivity
export default function handler(req, res) {
  console.log('Test endpoint called');
  res.status(200).json({ 
    message: 'Backend API is working correctly',
    timestamp: new Date().toISOString()
  });
} 