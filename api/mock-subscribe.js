import { clerkClient } from '@clerk/clerk-sdk-node';

// Mock subscription endpoint for testing
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
} 