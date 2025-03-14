import { clerkClient } from '@clerk/clerk-sdk-node';

export default async function handler(req, res) {
  try {
    // Get userId from path parameter
    const { userId } = req.query;
    
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
} 