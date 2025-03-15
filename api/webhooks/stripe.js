import { buffer } from 'micro';
import Stripe from 'stripe';
import { clerkClient } from '@clerk/clerk-sdk-node';

// Configure body parsing for raw buffer
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Log utility
const log = {
  info: (msg, data) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data || ''),
  error: (msg, err) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err || ''),
  debug: (msg, data) => console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`, data || '')
};

// Stripe webhook handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let event;
  try {
    // Get the raw request body as a buffer
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    
    log.debug('Received webhook request', { 
      hasSignature: !!sig, 
      bodyLength: buf.length,
      contentType: req.headers['content-type']
    });
    
    // Verify the signature
    event = stripe.webhooks.constructEvent(
      buf,
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
}

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