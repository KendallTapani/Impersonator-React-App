// Serverless health check endpoint
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  console.log('API health check called');
  res.status(200).json({ status: 'healthy' });
} 