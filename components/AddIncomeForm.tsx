// components/AddIncomeForm.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Income {
  incomeid?: number;
  incometitle: string;
  amount: number | string;
  income_date: string;
}

interface AddIncomeFormProps {
  editingIncome?: Income | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

const AddIncomeForm: React.FC<AddIncomeFormProps> = ({ 
  editingIncome, 
  onSuccess, 
  onCancel 
}) => {
  const { token } = useAuth();
  const [formData, setFormData] = useState<Income>({
    incometitle: '',
    amount: '',
    income_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingIncome) {
      setFormData({
        incometitle: editingIncome.incometitle,
        amount: editingIncome.amount,
        income_date: editingIncome.income_date.split('T')[0]
      });
    }
  }, [editingIncome]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.incometitle || !formData.amount || !formData.income_date) {
        throw new Error('All fields are required');
      }

      const amountNum = parseFloat(formData.amount.toString());
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Amount must be a positive number');
      }

      const payload = {
        ...formData,
        amount: amountNum,
        ...(editingIncome?.incomeid && { incomeid: editingIncome.incomeid })
      };

      const url = '/api/income';
      const method = editingIncome ? 'POST' : 'POST'; // Using POST for both create and update as per API

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to ${editingIncome ? 'update' : 'add'} income`);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || `Failed to ${editingIncome ? 'update' : 'add'} income`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
        {editingIncome ? 'Edit Income' : 'Add New Income'}
      </h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="incometitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Income Title *
          </label>
          <input
            type="text"
            id="incometitle"
            name="incometitle"
            value={formData.incometitle}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Salary, Freelance, Bonus, etc."
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Amount *
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="income_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Income Date *
          </label>
          <input
            type="date"
            id="income_date"
            name="income_date"
            value={formData.income_date}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : editingIncome ? 'Update Income' : 'Add Income'}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AddIncomeForm;