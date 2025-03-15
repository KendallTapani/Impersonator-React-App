# Vercel Deployment Guide

This guide outlines the steps needed to deploy the Impersonator React app to Vercel with serverless functions.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Git repository with your code
3. A Clerk account with API keys
4. A Stripe account with API keys and webhooks configured

## Environment Variables

Before deploying, you'll need to set up these environment variables in Vercel:

- `CLERK_SECRET_KEY` - Your Clerk secret key
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_PRICE_ID` - The ID of your subscription price
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret

## Deployment Steps

### 1. Install Dependencies

First, install the Vercel CLI:

```bash
npm install -g vercel
```

### 2. Configure Your Project for Vercel

Verify that you have:
- A `vercel.json` file in your project root (already created)
- Serverless functions in the `/api` directory (already created)
- Frontend code that uses relative paths for API calls (already configured)

### 3. Login to Vercel

```bash
vercel login
```

### 4. Deploy to Vercel

For a preview deployment:

```bash
vercel
```

For a production deployment:

```bash
vercel --prod
```

The CLI will guide you through the deployment process:
- Select your Vercel account
- Choose to link to an existing project or create a new one
- Confirm the project settings

### 5. Configure Environment Variables in Vercel Dashboard

1. Go to your project in the Vercel dashboard
2. Navigate to "Settings" > "Environment Variables"
3. Add all required environment variables (as listed above)
4. Deploy again or redeploy with the new environment variables:

```bash
vercel --prod
```

### 6. Update Webhook URLs

In your Stripe dashboard:
1. Go to "Developers" > "Webhooks"
2. Update your webhook URL to point to your Vercel deployment:
   - `https://your-vercel-app.vercel.app/api/webhooks/stripe`

In your Clerk dashboard:
1. Go to "API Keys"
2. Add your Vercel deployment URL to allowed origins

## Vercel Configuration

The `vercel.json` file is already configured with:

```json
{
  "version": 2,
  "builds": [
    { "src": "api/**/*.js", "use": "@vercel/node" },
    { "src": "package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

## Testing the Deployment

After deploying, test these endpoints:
1. Visit your Vercel deployment URL to check the frontend
2. Test the API health check: `https://your-vercel-app.vercel.app/api/health`
3. Try signing in and subscribing to verify Clerk and Stripe integration

## Troubleshooting

If you encounter issues:

1. Check Vercel deployment logs in the dashboard
2. Verify environment variables are set correctly
3. Check for CORS issues by inspecting the browser console
4. Test webhook delivery in Stripe dashboard

## Local Development After Migration

To run the application locally with the serverless functions:

```bash
npm install
npm run dev:full
```

This will start both the Vite dev server and Vercel's local development server. 