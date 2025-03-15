// Serverless health check endpoint with enhanced logging
export default function handler(req, res) {
  try {
    console.log('API health check called');
    console.log('Request method:', req.method);
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    
    // Set proper CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS request for preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
      console.log('Method not allowed:', req.method);
      return res.status(405).json({ error: 'Method not allowed', allowedMethod: 'GET' });
    }
    
    console.log('Sending successful health response');
    res.status(200).json({ 
      status: 'healthy',
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
      hasClerkSecret: !!process.env.CLERK_SECRET_KEY,
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
} 