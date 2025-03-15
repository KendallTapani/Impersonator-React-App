import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Log utility
const log = {
  info: (msg, data) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data || ''),
  error: (msg, err) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err || ''),
  debug: (msg, data) => console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`, data || '')
};

// Create Stripe checkout session
export default async function handler(req, res) {
  // Log request details for debugging
  log.debug('Received checkout request', {
    method: req.method,
    url: req.url,
    headers: {
      'content-type': req.headers['content-type'],
      origin: req.headers.origin,
      host: req.headers.host
    }
  });

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for preflight
  if (req.method === 'OPTIONS') {
    log.debug('Responding to OPTIONS preflight request');
    return res.status(200).end();
  }
  
  // Only allow POST method
  if (req.method !== 'POST') {
    log.error(`Method not allowed: ${req.method}`);
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: `This endpoint only accepts POST requests, received: ${req.method}`,
      allowedMethods: ['POST', 'OPTIONS']
    });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    
    if (!process.env.STRIPE_PRICE_ID) {
      throw new Error('STRIPE_PRICE_ID is not configured');
    }
    
    const { userId } = req.body;
    
    if (!userId) {
      log.error('Create checkout session failed - missing userId');
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    log.info(`Creating checkout session for user: ${userId}`);
    
    // Log Stripe configuration
    log.debug('Stripe configuration check', {
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasPriceId: !!process.env.STRIPE_PRICE_ID,
      priceId: process.env.STRIPE_PRICE_ID
    });
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/subscription`,
      client_reference_id: userId,
      metadata: { userId },
    });
    
    log.info(`Checkout session created successfully`, { sessionId: session.id });
    res.json({ url: session.url });
  } catch (error) {
    log.error('Checkout session creation failed', {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: error.message,
      type: error.type || 'unknown',
      code: error.code || 'unknown'
    });
  }
} 