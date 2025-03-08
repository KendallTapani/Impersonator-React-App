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

# Voice Impersonator

A React application that helps users practice voice impersonations with a catalog of celebrity, politician, podcaster, and YouTuber voices.

## Features

- **Extensive Voice Library**: Access a collection of 35+ personalities across various categories
- **Training Tools**: Practice with audio samples and compare your impersonation to the original
- **Organized Collections**: Browse voices by category (Politicians, Celebrities, Podcasters, YouTubers)
- **Simple Access**: Protected with an access code system (no login required)

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Modern web browser

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/voice-impersonator.git
cd voice-impersonator
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Start the development server
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Access Code

The app is protected with an access code system. To access the dashboard and training features:

1. Visit the landing page
2. Click "Access Voice Library"
3. Enter the access code: `voice-impersonator-XB7F9R2Z`

The access code grants access for 30 days and is stored in localStorage.

## Project Structure

```
voice-impersonator/
├── public/          # Static assets, voice samples, profile data
│   └── persons/     # Person profiles and audio samples
├── src/
│   ├── components/  # Reusable UI components
│   ├── context/     # React context providers
│   ├── hooks/       # Custom React hooks
│   ├── pages/       # Page components
│   └── utils/       # Utility functions
└── ...
```

## Deployment

### Deploying to Vercel

1. Push your code to GitHub
2. Sign up for [Vercel](https://vercel.com)
3. Import your GitHub repository
4. Vercel will automatically detect the React app configuration
5. Click "Deploy"

### Considerations

- The access code is currently hardcoded. In a production environment, consider using environment variables or a backend service for better security.
- Future iterations may include a proper payment system with Stripe.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Voice samples are for educational purposes only
- Built with React, TypeScript and Tailwind CSS
