// components/AddExpenseForm.tsx - Corrected with expenseid handling + debug logs
'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Expense {
  expenseid?: number;
  expensetitle: string;
  amount: number | string;
  paiddate: string;
  category?: string;
  description?: string;
}

interface AddExpenseFormProps {
  editingExpense?: Expense | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const AddExpenseForm = ({ editingExpense, onSuccess, onCancel }: AddExpenseFormProps) => {
  const { user, token } = useAuth();
  const [formData, setFormData] = useState({
    expenseid: undefined as number | undefined,
    expensetitle: '',
    amount: '',
    paiddate: new Date().toISOString().split('T')[0],
    category: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Wait until auth data is loaded and populate form if editing
  useEffect(() => {
    console.log('[AddExpenseForm] useEffect triggered. editingExpense:', editingExpense);
    if (user !== undefined || token !== undefined) {
      setLoadingAuth(false);
    }

    if (editingExpense) {
      console.log('[AddExpenseForm] Populating form with editingExpense:', editingExpense);
      setFormData({
        expenseid: editingExpense.expenseid,
        expensetitle: editingExpense.expensetitle,
        amount: editingExpense.amount.toString(),
        paiddate: editingExpense.paiddate.split('T')[0],
        category: editingExpense.category || ''
      });
    }
  }, [user, token, editingExpense]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log(`[AddExpenseForm] Field changed -> ${name}:`, value);
    setFormData({
      ...formData,
      [name]: value,
    });

    if (message) {
      setMessage('');
    }
  };

  const validateForm = () => {
    console.log('[AddExpenseForm] Validating form:', formData);
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
      console.warn('[AddExpenseForm] No user or token found.');
      setMessage('Please log in to add expenses');
      setMessageType('error');
      return;
    }

    if (!validateForm()) {
      console.warn('[AddExpenseForm] Validation failed.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const expenseData = {
        expenseid: formData.expenseid,
        expensetitle: formData.expensetitle.trim(),
        amount: parseFloat(formData.amount),
        paiddate: formData.paiddate,
        category: formData.category || undefined
      };

      const method = editingExpense ? 'PUT' : 'POST';
      const url = '/api/expenses/all';

      console.log(`[AddExpenseForm] Submitting ${method} request with data:`, expenseData);

      const response = await fetch(url, {
        method,
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
        if (response.ok) {
          data = { success: true };
        } else {
          throw new Error('Invalid server response');
        }
      }

      console.log('[AddExpenseForm] Server response:', data);

      if (response.ok) {
        setMessage(editingExpense ? 'Expense updated successfully!' : 'Expense added successfully!');
        setMessageType('success');

        if (!editingExpense) {
          console.log('[AddExpenseForm] Resetting form after add');
          setFormData({
            expenseid: undefined,
            expensetitle: '',
            amount: '',
            paiddate: new Date().toISOString().split('T')[0],
            category: ''
          });
        }

        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        throw new Error(data.error || data.message || `Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('[AddExpenseForm] Error saving expense:', error);
      setMessage(
        error instanceof Error
          ? error.message
          : `Failed to ${editingExpense ? 'update' : 'add'} expense. Please try again.`
      );
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingAuth) {
    console.log('[AddExpenseForm] Loading auth...');
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
    console.warn('[AddExpenseForm] User not logged in.');
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please log in to manage expenses.</p>
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
      <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
        {editingExpense ? 'Edit Expense' : 'Add New Expense'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
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

        {/* Amount */}
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

        {/* Date */}
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
            max={new Date().toISOString().split('T')[0]}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            disabled={isSubmitting}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Category
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            disabled={isSubmitting}
          >
            <option value="">Select Category</option>
            <option value="Food">Food</option>
            <option value="Transportation">Transportation</option>
            <option value="Housing">Housing</option>
            <option value="Utilities">Utilities</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-500 dark:bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {isSubmitting ? (editingExpense ? 'Updating...' : 'Adding...') : (editingExpense ? 'Update Expense' : 'Add Expense')}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`p-3 rounded-md text-center font-medium ${
              messageType === 'success'
                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
            }`}
          >
            {message}
          </div>
        )}
      </form>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">* Required fields</div>
    </div>
  );
};

export default AddExpenseForm;
