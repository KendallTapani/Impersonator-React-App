import Stripe from 'stripe';
import { clerkClient } from '@clerk/clerk-sdk-node';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
} 