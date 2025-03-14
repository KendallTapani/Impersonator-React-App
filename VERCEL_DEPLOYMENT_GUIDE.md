# Vercel Deployment Guide for Impersonator App

This guide explains how we prepared the Impersonator React Application for deployment on Vercel, transitioning from a separate Express backend to Vercel serverless functions.

## Architecture Changes

### Before

- **Frontend**: React application running on local dev server (port 5173)
- **Backend**: Express.js server running separately (port 3001)
- **Communication**: Frontend communicates with backend via proxy

### After

- **Frontend**: React application built with Vite, deployed as static files on Vercel
- **Backend**: Serverless API functions in the `/api` directory
- **Communication**: API routes are part of the same deployment, no separate backend needed

## Changes Made

### 1. Created Serverless API Functions

Converted Express routes into individual serverless functions in the `/api` directory:

- `/api/health.js` - Health check endpoint
- `/api/check-subscription/[userId].js` - Check user subscription status
- `/api/create-checkout-session.js` - Create Stripe checkout session
- `/api/create-portal-session.js` - Create Stripe customer portal session
- `/api/webhooks/stripe.js` - Handle Stripe webhook events
- `/api/test.js` - Test endpoint

Each serverless function follows the Vercel API pattern:

```javascript
export default function handler(req, res) {
  // Function logic here
}
```

### 2. Special Handling for Stripe Webhooks

Stripe webhooks require access to the raw request body for signature verification. We used the `micro` package to handle this:

```javascript
import { buffer } from 'micro';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const rawBody = await buffer(req);
  // Process webhook with rawBody
}
```

### 3. Added Vercel Configuration

Created a `vercel.json` file with routing and environment variable configurations:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "vite",
  "outputDirectory": "dist",
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ],
  "env": {
    "VITE_CLERK_PUBLISHABLE_KEY": "@clerk_publishable_key",
    "CLERK_SECRET_KEY": "@clerk_secret_key",
    "STRIPE_SECRET_KEY": "@stripe_secret_key",
    "STRIPE_PRICE_ID": "@stripe_price_id",
    "STRIPE_WEBHOOK_SECRET": "@stripe_webhook_secret"
  }
}
```

### 4. Updated Dependencies

Added required dependencies for the serverless functions:

- `@clerk/clerk-sdk-node` - For Clerk authentication
- `micro` - For handling raw request bodies in webhook endpoints

### 5. Updated Documentation

- Added detailed deployment instructions to the README
- Created this guide to explain the transition

## How It Works

### API Requests

1. When a user makes a request to an API endpoint (e.g., `/api/health`):
   - Vercel routes the request to the appropriate serverless function
   - The function executes and returns a response
   - No need to configure proxies or manage ports

### Stripe Webhooks

1. Stripe sends webhook events to `/api/webhooks/stripe`
2. The serverless function gets the raw request body
3. The function verifies the signature and processes the event
4. The function updates Clerk user metadata with subscription information

### Environment Variables

Environment variables are defined in the Vercel dashboard and automatically made available to:
- Frontend code (prefixed with `VITE_`)
- Serverless functions (all environment variables)

## Deployment Steps

1. Push the code to GitHub
2. Connect the repository to Vercel
3. Configure environment variables in the Vercel dashboard
4. Deploy!

## Local Development After These Changes

For local development, you can:

1. Use the existing Express backend for API endpoints
2. Or, use Vercel CLI to run the serverless functions locally:
   ```
   npm install -g vercel
   vercel dev
   ```

## Additional Considerations

### CORS

Serverless functions automatically handle CORS for same-domain requests. For local development, you may need to add CORS headers to each function:

```javascript
export default function handler(req, res) {
  // For local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Function logic
}
```

### Scaling

Vercel's serverless functions have certain limitations:
- Maximum execution time (10 seconds on hobby plans)
- Memory limits
- Cold starts for infrequently used functions

For high-traffic applications, consider these limitations and optimize accordingly. 