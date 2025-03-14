# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

# Impersonator React App

A voice impersonation training application with authentication and subscription management.

## Features

- Authentication with Clerk
- Subscription management with Stripe
- Protected routes based on subscription status
- Dashboard for browsing voice impersonation training content

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_PRICE_ID=your_stripe_price_id
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   ```
4. Start the development server:
   ```
   npm run dev
   ```
5. Start the backend server:
   ```
   npm run dev:backend
   ```
   
   Or start both simultaneously:
   ```
   npm run dev:full
   ```

## Vercel Deployment

This application is configured for seamless deployment on Vercel, where the frontend and API functions will work together without a separate backend.

### Pre-Deployment Steps

1. **Environment Variables Setup**  
   Set up the following environment variables in the Vercel dashboard:
   - `VITE_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key
   - `CLERK_SECRET_KEY` - Your Clerk secret key
   - `STRIPE_SECRET_KEY` - Your Stripe secret key
   - `STRIPE_PRICE_ID` - Your Stripe price ID for the subscription
   - `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook signing secret

2. **Clerk Configuration Update**
   - Add your Vercel deployment URL to the allowed origins in your Clerk dashboard
   - Update the redirect URLs for authentication

3. **Stripe Configuration Update**
   - Create a new webhook endpoint in your Stripe dashboard
   - Point it to your Vercel deployment URL + `/api/webhooks/stripe`
   - Get a new webhook signing secret and update your environment variables

### Deployment

1. Connect your GitHub repository to Vercel
2. Configure the build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Deploy!

### Post-Deployment

1. Test the authentication flow
2. Test the subscription flow
3. Verify that webhook events are being processed correctly

## Architecture

In the Vercel deployment:

- **Frontend**: React application built with Vite, deployed as static files
- **Backend**: Serverless API functions in the `/api` directory
- **Authentication**: Managed by Clerk
- **Payments**: Processed through Stripe

## Troubleshooting

### 404 Errors
If you encounter 404 errors when accessing API endpoints:
- Check that your Vercel deployment has all the required environment variables
- Verify that the API routes are correctly defined in the `/api` directory
- Make sure your Clerk and Stripe configurations are updated for your deployment URL

### CORS Issues
If you encounter CORS issues:
- The API routes should handle CORS automatically for the same domain
- For local development, update the CORS settings in your serverless functions

### Webhook Issues
If Stripe webhooks are not working:
- Check your webhook endpoint in the Stripe dashboard
- Verify that the webhook secret is correctly set in your environment variables
- Look at the Vercel function logs for any errors

## Application Features

- User authentication with Clerk
- Mock subscription system (preparing for Stripe integration)
- Voice impersonation training tools
- Profile management

## Routes

- `/` - Home page
- `/sign-in` - Sign in page
- `/sign-up` - Sign up page
- `/subscription` - Subscription page (requires authentication)
- `/dashboard` - User dashboard (requires subscription)
- `/training` - Training page (requires subscription)
- `/person/:personId` - Individual personality page (requires subscription)

## License

[MIT](LICENSE)
