// Serverless test endpoint
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  console.log('Test endpoint called');
  res.status(200).json({ 
    message: 'Backend API is working correctly',
    timestamp: new Date().toISOString()
  });
} 