import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AccessHeader() {
  const { remainingDays, revokeAccess } = useAuth();
  
  return (
    <div className="bg-gray-100 border-b border-gray-200 py-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-gray-600">
              Access active: <span className="font-medium">{remainingDays} days remaining</span>
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="text-sm text-blue-600 hover:text-blue-800">
              Dashboard
            </Link>
            <button 
              onClick={revokeAccess}
              className="text-sm text-gray-600 hover:text-red-600"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 