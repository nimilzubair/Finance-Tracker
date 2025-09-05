// components/AddInstallmentForm.tsx - FIXED
'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface AddInstallmentFormProps {
  onSuccess?: () => void;
}

const AddInstallmentForm: React.FC<AddInstallmentFormProps> = ({ onSuccess }) => {
  const { user, token } = useAuth(); // FIX: Use token from context
  const [formData, setFormData] = useState({
    installmenttitle: '', // FIX: Correct spelling
    startdate: new Date().toISOString().split('T')[0],
    installmentdurationinmonths: '', // FIX: Correct spelling
    amountpermonth: '',
    advancepaid: false,
    advanceamount: '',
    totalamount: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
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
      const response = await fetch('/api/installments', { // FIX: Correct endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // FIX: Use token from context
        },
        body: JSON.stringify({
          installmenttitle: formData.installmenttitle, // FIX: Correct spelling
          startdate: formData.startdate,
          installmentdurationinmonths: parseInt(formData.installmentdurationinmonths), // FIX: Correct spelling
          amountpermonth: parseFloat(formData.amountpermonth),
          advancepaid: formData.advancepaid,
          advanceamount: parseFloat(formData.advanceamount || '0'),
          totalamount: parseFloat(formData.totalamount),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Installment plan added successfully!');
        setFormData({
          installmenttitle: '', // FIX: Correct spelling
          startdate: new Date().toISOString().split('T')[0],
          installmentdurationinmonths: '', // FIX: Correct spelling
          amountpermonth: '',
          advancepaid: false,
          advanceamount: '',
          totalamount: ''
        });
        onSuccess?.();
      } else {
        setMessage(data.error || 'Failed to add installment plan');
      }
    } catch (error) {
      setMessage('Error adding installment plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
        Add New Installment Plan
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* title */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Plan Title
          </label>
          <input
            type="text"
            name="installmenttitle" // FIX: Correct spelling
            value={formData.installmenttitle} // FIX: Correct spelling
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="e.g., Car EMI, Education Loan"
          />
        </div>

        {/* start date + duration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Start Date
            </label>
            <input
              type="date"
              name="startdate"
              value={formData.startdate}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Duration (Months)
            </label>
            <input
              type="number"
              name="installmentdurationinmonths" // FIX: Correct spelling
              value={formData.installmentdurationinmonths} // FIX: Correct spelling
              onChange={handleChange}
              required
              min="1"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="12"
            />
          </div>
        </div>

        {/* monthly + total */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Monthly Amount
            </label>
            <input
              type="number"
              name="amountpermonth"
              value={formData.amountpermonth}
              onChange={handleChange}
              required
              step="0.01"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="0.00"
            />
          </div>

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
        </div>

        {/* advance toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="advancepaid"
            checked={formData.advancepaid}
            onChange={handleChange}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-500"
            id="advancepaid"
          />
          <label htmlFor="advancepaid" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Advance Payment Made
          </label>
        </div>

        {/* advance amount */}
        {formData.advancepaid && (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Advance Amount
            </label>
            <input
              type="number"
              name="advanceamount"
              value={formData.advanceamount}
              onChange={handleChange}
              step="0.01"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="0.00"
            />
          </div>
        )}

        {/* submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-purple-500 dark:bg-purple-600 text-white py-2 px-4 rounded-md 
                     hover:bg-purple-600 dark:hover:bg-purple-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Adding...' : 'Add Installment Plan'}
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

export default AddInstallmentForm;