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
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Wait until auth data is loaded
  useEffect(() => {
    if (user !== null || token !== null) {
      setLoadingAuth(false);
    }
  }, [user, token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !token) {
      setMessage('User not authenticated');
      console.error('Authentication error: User or token missing');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/expenses/recent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          expensetitle: formData.expensetitle,
          amount: parseFloat(formData.amount),
          paiddate: formData.paiddate,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Expense added successfully!');
        setFormData({
          expensetitle: '',
          amount: '',
          paiddate: new Date().toISOString().split('T')[0],
        });
        if (onSuccess) onSuccess();
      } else {
        setMessage(data.error || 'Failed to add expense');
      }
    } catch (error) {
      setMessage('Error adding expense');
      console.error('Error adding expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingAuth) return <p>Loading...</p>;
  if (!user || !token) return <p>Please log in to add expenses.</p>;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">Add New Expense</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Title</label>
          <input
            type="text"
            name="expensetitle"
            value={formData.expensetitle}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Expense title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Amount</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            required
            step="0.01"
            min="0.01"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Date</label>
          <input
            type="date"
            name="paiddate"
            value={formData.paiddate}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-500 dark:bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Adding...' : 'Add Expense'}
        </button>

        {message && (
          <p
            className={`text-center ${
              message.includes('successfully') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
};

export default AddExpenseForm;
