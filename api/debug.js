// Diagnostic endpoint for troubleshooting
export default function handler(req, res) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS request for preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Basic environment info (safe to expose)
    const envInfo = {
      nodeEnv: process.env.NODE_ENV || 'not set',
      region: process.env.VERCEL_REGION || 'unknown',
      hasClerkSecret: !!process.env.CLERK_SECRET_KEY,
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      hasStripePrice: !!process.env.STRIPE_PRICE_ID,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
    };
    
    // Request info
    const requestInfo = {
      method: req.method,
      path: req.url,
      query: req.query,
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        referer: req.headers.referer,
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'accept': req.headers.accept
      }
    };
    
    // System info
    const systemInfo = {
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    res.status(200).json({
      status: 'ok',
      message: 'Diagnostic information',
      environment: envInfo,
      request: requestInfo,
      system: systemInfo
    });
  } catch (error) {
    console.error('Diagnostic endpoint error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
} 