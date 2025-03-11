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
3. Enter the access code: `SigSauerP365Macro`

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
