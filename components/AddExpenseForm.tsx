// components/AddExpenseForm.tsx - Updated API call
'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface AddExpenseFormProps {
  onSuccess?: () => void;
}

const AddExpenseForm = ({ onSuccess }: AddExpenseFormProps) => {
  const { user, token } = useAuth();
  const [formData, setFormData] = useState({
    expensetitle: '',
    amount: '',
    paiddate: new Date().toISOString().split('T')[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Wait until auth data is loaded
  useEffect(() => {
    if (user !== undefined || token !== undefined) {
      setLoadingAuth(false);
    }
  }, [user, token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear message when user starts typing
    if (message) {
      setMessage('');
    }
  };

  const validateForm = () => {
    if (!formData.expensetitle.trim()) {
      setMessage('Please enter an expense title');
      setMessageType('error');
      return false;
    }
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setMessage('Please enter a valid amount greater than 0');
      setMessageType('error');
      return false;
    }
    
    if (!formData.paiddate) {
      setMessage('Please select a date');
      setMessageType('error');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !token) {
      setMessage('Please log in to add expenses');
      setMessageType('error');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const expenseData = {
        expensetitle: formData.expensetitle.trim(),
        amount: parseFloat(formData.amount),
        paiddate: formData.paiddate,
      };

      // ✅ FIXED: Use the correct API endpoint
      const response = await fetch('/api/expenses/all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(expenseData),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails but response is ok, consider it successful
        if (response.ok) {
          data = { success: true };
        } else {
          throw new Error('Invalid server response');
        }
      }

      if (response.ok) {
        setMessage('Expense added successfully!');
        setMessageType('success');
        setFormData({
          expensetitle: '',
          amount: '',
          paiddate: new Date().toISOString().split('T')[0],
        });
        
        // Call success callback after a short delay to show success message
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        throw new Error(data.error || data.message || `Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to add expense. Please try again.');
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingAuth) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please log in to add expenses.</p>
          <a 
            href="/login" 
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">Add New Expense</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Expense Title *
          </label>
          <input
            type="text"
            name="expensetitle"
            value={formData.expensetitle}
            onChange={handleChange}
            required
            maxLength={100}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="e.g., Groceries, Gas, Rent"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Amount ($) *
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            required
            step="0.01"
            min="0.01"
            max="999999.99"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="0.00"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Date *
          </label>
          <input
            type="date"
            name="paiddate"
            value={formData.paiddate}
            onChange={handleChange}
            required
            max={new Date().toISOString().split('T')[0]} // Prevent future dates
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            disabled={isSubmitting}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-500 dark:bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          )}
          {isSubmitting ? 'Adding Expense...' : 'Add Expense'}
        </button>

        {message && (
          <div className={`p-3 rounded-md text-center font-medium ${
            messageType === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
          }`}>
            {message}
          </div>
        )}
      </form>
      
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        * Required fields
      </div>
    </div>
  );
};

export default AddExpenseForm;