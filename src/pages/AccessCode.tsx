import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// This would normally come from an environment variable or backend
// But for simplicity we're hard-coding it - should be changed regularly
const ACCESS_CODE = "SigSauerP365Macro";

export function AccessCode() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { grantAccess, hasAccess } = useAuth();
  
  // If user already has access, redirect to dashboard
  useEffect(() => {
    if (hasAccess) {
      navigate('/dashboard');
    }
  }, [hasAccess, navigate]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.trim() === ACCESS_CODE) {
      // Grant access for 30 days
      grantAccess(30);
      navigate('/dashboard');
    } else {
      setError('Invalid access code. Please try again.');
    }
  };
  
  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4 text-center">Access Voice Impersonator</h1>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <p className="text-blue-700">
          <strong>Note:</strong> This is a preview version with access code protection.
          Enter the access code below to continue.
        </p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Access Code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your access code"
          />
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-md mb-4">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Submit
        </button>
      </form>
      
      <div className="mt-6 text-sm text-gray-500 text-center">
        <p>Need an access code? Contact the developer for access.</p>
      </div>
    </div>
  );
} 