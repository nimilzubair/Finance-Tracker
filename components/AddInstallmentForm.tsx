// components/AddInstallmentForm.tsx - Updated with editing support
'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Installment {
  installmentid?: number;
  installmenttitle: string;
  totalamount: number | string;
  total_paid?: number | string;
  remaining_amount?: number | string;
  payments_made?: number;
  startdate: string;
  installmentdurationinmonths: number | string;
  amountpermonth?: number | string;
  advancepaid?: boolean;
  advanceamount?: number | string;
  description?: string;
}

interface AddInstallmentFormProps {
  editingInstallment?: Installment | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const AddInstallmentForm: React.FC<AddInstallmentFormProps> = ({ editingInstallment, onSuccess, onCancel }) => {
  const { user, token } = useAuth();
  const [formData, setFormData] = useState({
    installmenttitle: '',
    startdate: new Date().toISOString().split('T')[0],
    installmentdurationinmonths: '',
    amountpermonth: '',
    totalamount: '',
    advancepaid: false,
    advanceamount: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (editingInstallment) {
      setFormData({
        installmenttitle: editingInstallment.installmenttitle,
        startdate: editingInstallment.startdate.split('T')[0],
        installmentdurationinmonths: editingInstallment.installmentdurationinmonths.toString(),
        amountpermonth: editingInstallment.amountpermonth?.toString() || '',
        totalamount: editingInstallment.totalamount.toString(),
        advancepaid: editingInstallment.advancepaid || false,
        advanceamount: editingInstallment.advanceamount?.toString() || '',
        description: editingInstallment.description || ''
      });
    }
  }, [editingInstallment]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });

    if (message) {
      setMessage('');
    }
  };

  const calculateMonthlyAmount = () => {
    const total = parseFloat(formData.totalamount) || 0;
    const duration = parseInt(formData.installmentdurationinmonths) || 1;
    const advance = parseFloat(formData.advanceamount) || 0;
    return ((total - advance) / duration).toFixed(2);
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
      const duration = parseInt(formData.installmentdurationinmonths);
      const monthlyAmount = parseFloat(formData.amountpermonth || calculateMonthlyAmount());
      const advanceAmount = parseFloat(formData.advanceamount || '0');

      if (isNaN(totalAmount) || totalAmount <= 0) {
        throw new Error('Total amount must be a positive number');
      }

      if (isNaN(duration) || duration <= 0) {
        throw new Error('Duration must be a positive number of months');
      }

      if (isNaN(monthlyAmount) || monthlyAmount <= 0) {
        throw new Error('Monthly amount must be a positive number');
      }

      if (advanceAmount < 0) {
        throw new Error('Advance amount cannot be negative');
      }

      if (advanceAmount > totalAmount) {
        throw new Error('Advance amount cannot exceed total amount');
      }

      const installmentData = {
        installmenttitle: formData.installmenttitle.trim(),
        startdate: formData.startdate,
        installmentdurationinmonths: duration,
        amountpermonth: monthlyAmount,
        totalamount: totalAmount,
        advancepaid: formData.advancepaid,
        advanceamount: advanceAmount,
        description: formData.description.trim() || undefined,
        ...(editingInstallment?.installmentid && { installmentid: editingInstallment.installmentid })
      };

      const method = editingInstallment ? 'PUT' : 'POST';
      const url = editingInstallment ? `/api/installments?id=${editingInstallment.installmentid}` : '/api/installments';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(installmentData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(editingInstallment ? 'Installment plan updated successfully!' : 'Installment plan added successfully!');
        setMessageType('success');
        
        if (!editingInstallment) {
          setFormData({
            installmenttitle: '',
            startdate: new Date().toISOString().split('T')[0],
            installmentdurationinmonths: '',
            amountpermonth: '',
            totalamount: '',
            advancepaid: false,
            advanceamount: '',
            description: ''
          });
        }
        
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        throw new Error(data.error || data.message || `Failed to ${editingInstallment ? 'update' : 'add'} installment plan`);
      }
    } catch (error: any) {
      setMessage(error.message || `Error ${editingInstallment ? 'updating' : 'adding'} installment plan`);
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
        {editingInstallment ? 'Edit Installment Plan' : 'Add New Installment Plan'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Plan Title *
          </label>
          <input
            type="text"
            name="installmenttitle"
            value={formData.installmenttitle}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Car EMI, Education Loan"
            disabled={isSubmitting}
          />
        </div>

        {/* Start date + duration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Start Date *
            </label>
            <input
              type="date"
              name="startdate"
              value={formData.startdate}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Duration (Months) *
            </label>
            <input
              type="number"
              name="installmentdurationinmonths"
              value={formData.installmentdurationinmonths}
              onChange={handleChange}
              required
              min="1"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="12"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Monthly + total */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Monthly Amount ($) *
            </label>
            <input
              type="number"
              name="amountpermonth"
              value={formData.amountpermonth || calculateMonthlyAmount()}
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
        </div>

        {/* Advance toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="advancepaid"
            checked={formData.advancepaid}
            onChange={handleChange}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
            id="advancepaid"
            disabled={isSubmitting}
          />
          <label htmlFor="advancepaid" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Advance Payment Made
          </label>
        </div>

        {/* Advance amount */}
        {formData.advancepaid && (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Advance Amount ($)
            </label>
            <input
              type="number"
              name="advanceamount"
              value={formData.advanceamount}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              disabled={isSubmitting}
            />
          </div>
        )}

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
            placeholder="Optional plan description"
            disabled={isSubmitting}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-purple-500 dark:bg-purple-600 text-white py-3 px-4 rounded-md 
                       hover:bg-purple-600 dark:hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {isSubmitting ? (editingInstallment ? 'Updating...' : 'Adding...') : (editingInstallment ? 'Update Plan' : 'Add Plan')}
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

export default AddInstallmentForm;