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
  const { user, token } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && token) {
      fetchRecentExpenses();
    }
  }, [user, token]);

  const fetchRecentExpenses = async () => {
    try {
      const response = await fetch(`/api/expenses/recent?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
      } else {
        console.error('Failed to fetch recent expenses');
      }
    } catch (error) {
      console.error('Error fetching recent expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `-$${isNaN(num) ? '0.00' : num.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        {showTitle && (
          <h2 className="text-xl font-semibold mb-4 text-blue-800 dark:text-blue-200">
            Recent Expenses
          </h2>
        )}
        <p className="text-gray-700 dark:text-gray-300">Loading...</p>
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

      {expenses.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No recent expenses</p>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense, index) => (
            <div
              key={index}
              className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700"
            >
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  {expense.expensetitle}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(expense.paiddate).toLocaleDateString()}
                </p>
              </div>
              <span className="text-red-600 dark:text-red-400 font-semibold">
                {formatAmount(expense.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={fetchRecentExpenses}
        className="mt-4 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
      >
        Refresh
      </button>
    </div>
  );
};

export default RecentExpenses;