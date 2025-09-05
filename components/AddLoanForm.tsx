// components/AddLoanForm.tsx - FIXED
'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface AddLoanFormProps {
  onSuccess?: () => void;
}

const AddLoanForm: React.FC<AddLoanFormProps> = ({ onSuccess }) => {
  const { user, token } = useAuth(); // FIX: Use token from context
  const [formData, setFormData] = useState({
    loantitle: '',
    totalamount: '',
    amountpaid: '',
    amountleft: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) { // FIX: Check both user and token
      setMessage('User not authenticated');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // FIX: Use token from context
        },
        body: JSON.stringify({
          loantitle: formData.loantitle,
          totalamount: parseFloat(formData.totalamount),
          amountpaid: parseFloat(formData.amountpaid || '0'),
          amountleft: parseFloat(formData.amountleft || formData.totalamount),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Loan added successfully!');
        setFormData({
          loantitle: '',
          totalamount: '',
          amountpaid: '',
          amountleft: '',
        });
        onSuccess?.();
      } else {
        setMessage(data.error || 'Failed to add loan');
      }
    } catch (error) {
      setMessage('Error adding loan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
        Add New Loan
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Loan Title */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Loan Title
          </label>
          <input
            type="text"
            name="loantitle"
            value={formData.loantitle}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="e.g., Car Loan, Mortgage"
          />
        </div>

        {/* Total Amount */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Total Amount
          </label>
          <input
            type="number"
            name="totalamount"
            value={formData.totalamount}
            onChange={handleChange}
            required
            step="0.01"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="0.00"
          />
        </div>

        {/* Amount Paid */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Amount Paid
          </label>
          <input
            type="number"
            name="amountpaid"
            value={formData.amountpaid}
            onChange={handleChange}
            step="0.01"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="0.00 (optional)"
          />
        </div>

        {/* Amount Left */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Amount Left
          </label>
          <input
            type="number"
            name="amountleft"
            value={formData.amountleft}
            onChange={handleChange}
            step="0.01"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="0.00 (optional)"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-green-500 dark:bg-green-600 text-white py-2 px-4 rounded-md 
                     hover:bg-green-600 dark:hover:bg-green-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Adding...' : 'Add Loan'}
        </button>

        {message && (
          <p className={`text-center ${message.includes('successfully') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
};

export default AddLoanForm;