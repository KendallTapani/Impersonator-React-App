require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { clerkClient } = require('@clerk/clerk-sdk-node');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Add logging utility
const log = {
  info: (msg, data) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data || ''),
  error: (msg, err) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err || ''),
  debug: (msg, data) => console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`, data || '')
};

// Initialize Express app
const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// IMPORTANT: This middleware must come BEFORE any routes are defined
// Handle Stripe webhooks differently from other routes
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhooks/stripe') {
    // For webhook requests, use raw body parser
    express.raw({type: 'application/json'})(req, res, next);
  } else {
    // For all other requests, parse JSON
    express.json()(req, res, next);
  }
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Add API-prefixed health check endpoint to match frontend expectations
app.get('/api/health', (req, res) => {
  console.log('API health check called');
  res.status(200).json({ status: 'ok' });
});

// Test route to verify API connectivity
app.get('/api/test', (req, res) => {
  console.log('Test endpoint called');
  res.status(200).json({ 
    message: 'Backend API is working correctly',
    timestamp: new Date().toISOString()
  });
});

// Check if user has an active subscription
app.get('/api/check-subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    console.log(`Checking subscription for user: ${userId}`);
    
    // Get the user from Clerk
    const user = await clerkClient.users.getUser(userId);
    
    // Check for subscription in privateMetadata
    const hasSubscription = user.privateMetadata?.hasActiveSubscription === true;
    
    console.log(`Subscription status for ${userId}: ${hasSubscription ? 'Active' : 'Inactive'}`);
    
    return res.status(200).json({ 
      hasActiveSubscription: hasSubscription 
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    return res.status(500).json({ error: 'Failed to check subscription' });
  }
});

// Mock subscription endpoint (simulates payment success)
app.post('/api/mock-subscribe', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    console.log(`Creating mock subscription for user: ${userId}`);
    
    // Create mock subscription data
    const mockSubscriptionData = {
      hasActiveSubscription: true,
      mockStripeSubscriptionId: `sub_mock_${Date.now()}`,
      subscriptionCreatedAt: new Date().toISOString(),
      subscriptionStatus: 'active',
      subscriptionPlan: 'pro',
      subscriptionPriceId: 'price_mock_123'
    };
    
    // Update user's private metadata with mock subscription data
    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: mockSubscriptionData
    });
    
    console.log(`Successfully created mock subscription for user: ${userId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Subscription activated successfully'
    });
  } catch (error) {
    console.error('Mock subscription error:', error);
    return res.status(500).json({ error: 'Failed to activate subscription' });
  }
});

// Create checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
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
});

// Create customer portal session
app.post('/api/create-portal-session', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    console.log(`Creating portal session for user: ${userId}`);
    
    // Get user from Clerk
    const user = await clerkClient.users.getUser(userId);
    const stripeCustomerId = user.privateMetadata.stripeCustomerId;
    
    if (!stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer found for this user' });
    }
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${req.headers.origin}/dashboard`,
    });
    
    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Portal error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook endpoint
app.post('/api/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    log.debug('Received webhook request', { 
      hasSignature: !!sig, 
      bodyLength: req.body?.length || (req.body ? '(parsed object)' : 'undefined'),
      contentType: req.headers['content-type']
    });
    
    // req.body should be raw buffer at this point
    if (!Buffer.isBuffer(req.body)) {
      log.error('Webhook payload is not a Buffer', { 
        bodyType: typeof req.body,
        isBuffer: Buffer.isBuffer(req.body) 
      });
    }
    
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    log.info(`Received webhook event: ${event.type}`, { id: event.id });
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const checkoutSession = event.data.object;
        log.info('Processing checkout.session.completed', { 
          sessionId: checkoutSession.id,
          customerId: checkoutSession.customer 
        });
        await handleCheckoutSession(checkoutSession);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        log.info(`Processing ${event.type}`, {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status
        });
        await handleSubscriptionChange(subscription);
        break;
      default:
        log.debug(`Unhandled event type ${event.type}`);
    }
    
    res.json({received: true});
  } catch (err) {
    log.error(`Webhook signature verification failed`, err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Helper function for checkout completion
async function handleCheckoutSession(session) {
  // Extract the user ID from the session
  const userId = session.metadata.userId;
  const customerId = session.customer;
  
  if (!userId) {
    log.error('No user ID found in session metadata', { sessionId: session.id });
    return;
  }
  
  log.info(`Processing checkout session for user: ${userId}`, { 
    sessionId: session.id, 
    customerId
  });
  
  try {
    // Update Clerk metadata with Stripe customer ID
    log.debug(`Updating Clerk metadata with Stripe customer ID`, { 
      userId, 
      customerId 
    });
    
    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: {
        stripeCustomerId: customerId
      }
    });
    
    // Then handle the subscription data
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });
    
    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      log.debug(`Found subscription for customer`, { 
        subscriptionId: subscription.id,
        status: subscription.status
      });
      await updateSubscriptionMetadata(userId, subscription);
    } else {
      log.debug(`No subscriptions found for customer`, { customerId });
    }
    
    log.info(`Successfully processed checkout session for user: ${userId}`);
  } catch (error) {
    log.error('Error handling checkout session', error);
  }
}

// Helper function for subscription changes
async function handleSubscriptionChange(subscription) {
  try {
    // Get customer ID from subscription
    const customerId = subscription.customer;
    
    log.info(`Processing subscription change for customer: ${customerId}`, {
      subscriptionId: subscription.id,
      status: subscription.status
    });
    
    // Find user with this Stripe customer ID
    log.debug('Querying Clerk for user with Stripe customer ID', { customerId });
    const users = await clerkClient.users.getUserList({
      limit: 100,
    });
    
    const user = users.find(u => 
      u.privateMetadata.stripeCustomerId === customerId
    );
    
    if (user) {
      log.debug('Found user with matching Stripe customer ID', { 
        userId: user.id,
        customerId
      });
      await updateSubscriptionMetadata(user.id, subscription);
      log.info(`Successfully updated subscription status for user: ${user.id}`);
    } else {
      log.error(`No user found with Stripe customer ID: ${customerId}`);
    }
  } catch (error) {
    log.error('Error handling subscription change', error);
  }
}

// Update metadata based on subscription
async function updateSubscriptionMetadata(userId, subscription) {
  try {
    log.debug(`Updating subscription metadata for user: ${userId}`, {
      subscriptionId: subscription.id,
      status: subscription.status
    });
    
    // Get current metadata
    const user = await clerkClient.users.getUser(userId);
    const currentMetadata = user.privateMetadata || {};
    
    // Get price and product info
    const subscriptionItem = subscription.items.data[0];
    const priceId = subscriptionItem.price.id;
    
    log.debug('Retrieving price and product details', { priceId });
    const price = await stripe.prices.retrieve(priceId);
    const product = await stripe.products.retrieve(price.product);
    
    // Prepare metadata update
    const updatedMetadata = {
      ...currentMetadata,
      stripeCustomerId: subscription.customer,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionPlan: product.name,
      subscriptionPriceId: priceId,
      subscriptionCreatedAt: new Date(subscription.created * 1000).toISOString(),
      hasActiveSubscription: subscription.status === 'active',
    };
    
    log.debug('Updating Clerk user metadata', {
      userId,
      plan: product.name,
      status: subscription.status,
      isActive: subscription.status === 'active'
    });
    
    // Update Clerk metadata
    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: updatedMetadata
    });
    
    log.info(`Updated subscription metadata for user: ${userId}`, {
      subscriptionId: subscription.id,
      plan: product.name,
      status: subscription.status
    });
  } catch (error) {
    log.error('Error updating subscription metadata', {
      userId,
      subscriptionId: subscription?.id,
      error: error.message
    });
  }
}

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Log Stripe configuration on startup
  log.info('Stripe configuration', {
    hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
    secretKeyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 7) : 'missing',
    hasPriceId: !!process.env.STRIPE_PRICE_ID,
    priceId: process.env.STRIPE_PRICE_ID || 'missing',
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    webhookSecretPrefix: process.env.STRIPE_WEBHOOK_SECRET ? process.env.STRIPE_WEBHOOK_SECRET.substring(0, 7) : 'missing'
  });
}); 