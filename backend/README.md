# Impersonator Backend

This is the backend server for the Impersonator application. It provides API endpoints for subscription management.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the following:
   ```
   CLERK_SECRET_KEY=your_clerk_secret_key
   PORT=3001
   ```

3. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

### Check Subscription Status
- **GET** `/api/check-subscription/:userId`
- Checks if a user has an active subscription
- Returns `{ hasActiveSubscription: boolean }`

### Mock Subscribe
- **POST** `/api/mock-subscribe`
- Body: `{ userId: string }`
- Adds mock subscription data to user's private metadata
- Returns `{ success: true, message: string }`

## Future Integration

In the future, this will be integrated with Stripe for real payments. The mock subscription endpoint will be replaced with a Stripe checkout session creation endpoint. 