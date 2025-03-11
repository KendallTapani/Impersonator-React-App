# Voice Impersonator

A React application that helps users practice voice impersonations with a catalog of celebrity, politician, podcaster, and YouTuber voices.
Eventually I'll rewrite it in React Native and put it on the app store for a few bucks, but I haven't got my mac mini yet.
It does work on Safari though.

## Features

- **Extensive Voice Library**: Access a collection of 35+ personalities across various categories
- **Training Tools**: Practice with audio samples and compare your impersonation to the original
- **Organized Collections**: Browse voices by category (Politicians, Celebrities, Podcasters, YouTubers)
- **Simple Access**: Protected with an access code system (no login required)

## Getting Started: 
- Hosted on voiceimpersonator.vercel.app


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

### Considerations

- The access code is currently hardcoded. In a production environment, consider using environment variables or a backend service for better security.
- Future iterations may include a proper payment system with Stripe.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Voice samples are for educational purposes only
- Built with React, TypeScript and Tailwind CSS
