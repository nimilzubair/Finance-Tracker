// components/AddLoanForm.tsx - Updated with editing support
'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Loan {
  loanid?: number;
  loantitle: string;
  totalamount: number | string;
  amountpaid?: number | string;
  amountleft?: number | string;
  description?: string;
}

interface AddLoanFormProps {
  editingLoan?: Loan | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const AddLoanForm: React.FC<AddLoanFormProps> = ({ editingLoan, onSuccess, onCancel }) => {
  const { user, token } = useAuth();
  const [formData, setFormData] = useState({
    loantitle: '',
    totalamount: '',
    amountpaid: '',
    amountleft: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (editingLoan) {
      setFormData({
        loantitle: editingLoan.loantitle,
        totalamount: editingLoan.totalamount.toString(),
        amountpaid: editingLoan.amountpaid?.toString() || '',
        amountleft: editingLoan.amountleft?.toString() || '',
        description: editingLoan.description || ''
      });
    }
  }, [editingLoan]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear message when user starts typing
    if (message) {
      setMessage('');
    }
  };

  const calculateAmountLeft = () => {
    const total = parseFloat(formData.totalamount) || 0;
    const paid = parseFloat(formData.amountpaid) || 0;
    return (total - paid).toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !token) {
      setMessage('User not authenticated');
      setMessageType('error');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const totalAmount = parseFloat(formData.totalamount);
      const amountPaid = parseFloat(formData.amountpaid || '0');
      const amountLeft = parseFloat(formData.amountleft || calculateAmountLeft());

      if (isNaN(totalAmount) || totalAmount <= 0) {
        throw new Error('Total amount must be a positive number');
      }

      if (amountPaid < 0) {
        throw new Error('Amount paid cannot be negative');
      }

      if (amountLeft < 0) {
        throw new Error('Amount left cannot be negative');
      }

      if (amountPaid > totalAmount) {
        throw new Error('Amount paid cannot exceed total amount');
      }

      const loanData = {
        loantitle: formData.loantitle.trim(),
        totalamount: totalAmount,
        amountpaid: amountPaid,
        amountleft: amountLeft,
        description: formData.description.trim() || undefined,
        ...(editingLoan?.loanid && { loanid: editingLoan.loanid })
      };

      const method = editingLoan ? 'PUT' : 'POST';
      const url = editingLoan ? `/api/loans?id=${editingLoan.loanid}` : '/api/loans';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(loanData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(editingLoan ? 'Loan updated successfully!' : 'Loan added successfully!');
        setMessageType('success');
        
        if (!editingLoan) {
          setFormData({
            loantitle: '',
            totalamount: '',
            amountpaid: '',
            amountleft: '',
            description: ''
          });
        }
        
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        throw new Error(data.error || data.message || `Failed to ${editingLoan ? 'update' : 'add'} loan`);
      }
    } catch (error: any) {
      setMessage(error.message || `Error ${editingLoan ? 'updating' : 'adding'} loan`);
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
        {editingLoan ? 'Edit Loan' : 'Add New Loan'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Loan Title */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Loan Title *
          </label>
          <input
            type="text"
            name="loantitle"
            value={formData.loantitle}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Car Loan, Mortgage"
            disabled={isSubmitting}
          />
        </div>

        {/* Total Amount */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Total Amount ($) *
          </label>
          <input
            type="number"
            name="totalamount"
            value={formData.totalamount}
            onChange={handleChange}
            required
            step="0.01"
            min="0.01"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
            disabled={isSubmitting}
          />
        </div>

        {/* Amount Paid */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Amount Paid ($)
          </label>
          <input
            type="number"
            name="amountpaid"
            value={formData.amountpaid}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
            disabled={isSubmitting}
          />
        </div>

        {/* Amount Left */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Amount Left ($)
          </label>
          <input
            type="number"
            name="amountleft"
            value={formData.amountleft || calculateAmountLeft()}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
            disabled={isSubmitting}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            placeholder="Optional loan description"
            disabled={isSubmitting}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-green-500 dark:bg-green-600 text-white py-3 px-4 rounded-md 
                       hover:bg-green-600 dark:hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {isSubmitting ? (editingLoan ? 'Updating...' : 'Adding...') : (editingLoan ? 'Update Loan' : 'Add Loan')}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-md 
                         hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

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
    </div>
  );
};

export default AddLoanForm;