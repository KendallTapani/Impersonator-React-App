import { SignIn } from '@clerk/clerk-react';

export function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Sign In</h1>
        <SignIn routing="path" path="/sign-in" />
      </div>
    </div>
  );
} 