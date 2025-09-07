// components/RecentExpenses.tsx - FIXED
'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Expense {
  expensetitle: string;
  amount: number | string;
  paiddate: string;
  createdat: string;
}

interface RecentExpensesProps {
  showTitle?: boolean;
  limit?: number;
}

const RecentExpenses = ({ showTitle = false, limit = 5 }: RecentExpensesProps) => {
  const { token } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchRecentExpenses();
    }
  }, [token, limit]);

  const fetchRecentExpenses = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/expenses/recent?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExpenses(Array.isArray(data) ? data : []);
      } else {
        throw new Error(`Failed to fetch expenses (${response.status})`);
      }
    } catch (error) {
      console.error('Error fetching recent expenses:', error);
      setError('Failed to load expenses');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${isNaN(num) ? '0.00' : num.toFixed(2)}`;
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        {showTitle && (
          <h2 className="text-xl font-semibold mb-4 text-blue-800 dark:text-blue-200">
            Recent Expenses
          </h2>
        )}
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      {showTitle && (
        <h2 className="text-xl font-semibold mb-4 text-blue-800 dark:text-blue-200">
          Recent Expenses
        </h2>
      )}

      {error && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {!error && expenses.length === 0 ? (
        <div className="text-center py-6">
          <div className="mb-3">
            <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">No recent expenses</p>
          <a 
            href="/dashboard?tab=expenses&subtab=add" 
            className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
          >
            Add your first expense
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense, index) => (
            <div
              key={`${expense.expensetitle}-${expense.paiddate}-${index}`}
              className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {expense.expensetitle}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(expense.paiddate)}
                </p>
              </div>
              <div className="text-right ml-4">
                <span className="text-red-600 dark:text-red-400 font-semibold">
                  -{formatAmount(expense.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={fetchRecentExpenses}
          disabled={loading}
          className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium disabled:opacity-50 flex items-center gap-1"
        >
          {loading && <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
          Refresh
        </button>
        
        {expenses.length > 0 && (
          <a 
            href="/dashboard?tab=expenses" 
            className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
          >
            View all expenses →
          </a>
        )}
      </div>
    </div>
  );
};

export default RecentExpenses;