import { SignUp } from '@clerk/clerk-react';

export function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Sign Up</h1>
        <SignUp routing="path" path="/sign-up" />
      </div>
    </div>
  );
} 