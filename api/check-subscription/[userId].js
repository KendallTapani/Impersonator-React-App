import { clerkClient } from '@clerk/clerk-sdk-node';

// Serverless function to check user subscription status
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
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