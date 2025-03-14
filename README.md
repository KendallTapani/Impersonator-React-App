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

A voice impersonation training application with Clerk authentication and subscription management.

## Setup and Installation

### Prerequisites
- Node.js (v16+)
- npm

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd Impersonator-React-App
   ```

2. Install dependencies:
   ```
   npm install
   cd backend && npm install && cd ..
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory:
     ```
     VITE_CLERK_PUBLISHABLE_KEY=pk_test_cG9zaXRpdmUtY29uZG9yLTQ0LmNsZXJrLmFjY291bnRzLmRldiQ
     ```
   - Verify that `backend/.env` contains:
     ```
     CLERK_SECRET_KEY=sk_test_1eI85DeCcQHZJUeXkxlRlfyfIMBurR0gAJv0hqDL5g
     PORT=3001
     ```

## Running the Application

### Option 1: Start Backend and Frontend Together

To run both the backend and frontend servers with a single command:

```
npm run dev:full
```

This will start:
- Backend server on http://localhost:3001
- Frontend development server on http://localhost:5173

### Option 2: Run with Connection Check

For a safer startup with backend connection verification:

```
npm run start:safe
```

### Option 3: Run Servers Separately

To run the servers individually:

1. Start the backend:
   ```
   cd backend
   npm run dev
   ```

2. In a separate terminal, start the frontend:
   ```
   npm run dev
   ```

## Testing Backend Connectivity

To test if the backend is running and accessible:

```
npm run test-connection
```

To test all API endpoints directly:

```
npm run test-api
```

## Troubleshooting

### 404 Errors When Accessing API

If you see 404 errors in the console:

1. Make sure the backend server is running on port 3001
2. Check that all endpoints in the backend have the correct `/api` prefix
3. Verify that the Vite proxy settings in `vite.config.ts` are correctly set up
4. Try restarting both the frontend and backend servers

### CORS Issues

If you encounter CORS errors:

1. Check the CORS configuration in `backend/server.js`
2. Make sure the allowed origins include both `http://localhost:5173` and `http://127.0.0.1:5173`
3. Verify that the API requests include the proper headers and credentials

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
