// components/AddInstallmentForm.tsx - ENHANCED with payment frequencies
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
  periods_remaining?: number;
  startdate: string;
  installmentdurationinmonths: number | string;
  payment_frequency?: string;
  payment_interval_days?: number | string;
  amountpermonth?: number | string;
  advancepaid?: boolean;
  advanceamount?: number | string;
  description?: string;
  status?: string;
}

interface AddInstallmentFormProps {
  editingInstallment?: Installment | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const paymentFrequencyOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-Weekly (Every 2 weeks)' },
  { value: 'quarterly', label: 'Quarterly (Every 3 months)' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom Interval' }
];

const AddInstallmentForm: React.FC<AddInstallmentFormProps> = ({ 
  editingInstallment, 
  onSuccess, 
  onCancel 
}) => {
  const { user, token } = useAuth();
  const [formData, setFormData] = useState({
    installmenttitle: '',
    startdate: new Date().toISOString().split('T')[0],
    installmentdurationinmonths: '',
    payment_frequency: 'monthly',
    payment_interval_days: '',
    totalamount: '',
    advancepaid: false,
    advanceamount: '',
    description: ''
  });
  
  const [calculatedValues, setCalculatedValues] = useState({
    amountPerPeriod: 0,
    totalPeriods: 0,
    netAmount: 0
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Load editing data
  useEffect(() => {
    if (editingInstallment) {
      setFormData({
        installmenttitle: editingInstallment.installmenttitle,
        startdate: editingInstallment.startdate.split('T')[0],
        installmentdurationinmonths: editingInstallment.installmentdurationinmonths.toString(),
        payment_frequency: editingInstallment.payment_frequency || 'monthly',
        payment_interval_days: editingInstallment.payment_interval_days?.toString() || '',
        totalamount: editingInstallment.totalamount.toString(),
        advancepaid: editingInstallment.advancepaid || false,
        advanceamount: editingInstallment.advanceamount?.toString() || '',
        description: editingInstallment.description || ''
      });
    }
  }, [editingInstallment]);

  // ADD THIS HELPER FUNCTION BEFORE THE useEffect
const calculateTotalPeriods = (durationMonths: number, frequency: string, customDays?: number): number => {
  switch (frequency) {
    case 'weekly':
      return Math.ceil((durationMonths * 30) / 7);
    case 'bi-weekly':
      return Math.ceil((durationMonths * 30) / 14);
    case 'quarterly':
      return Math.ceil(durationMonths / 3);
    case 'yearly':
      return Math.ceil(durationMonths / 12);
    case 'custom':
      return customDays ? Math.ceil((durationMonths * 30) / customDays) : durationMonths;
    case 'monthly':
    default:
      return durationMonths;
  }
};
// Calculate payment amounts based on frequency
useEffect(() => {
  const total = parseFloat(formData.totalamount) || 0;
  const advance = formData.advancepaid ? (parseFloat(formData.advanceamount) || 0) : 0;
  const netAmount = total - advance;
  const durationMonths = parseInt(formData.installmentdurationinmonths) || 1;
  const intervalDays = formData.payment_frequency === 'custom' ? parseInt(formData.payment_interval_days) || 30 : undefined;

  const totalPeriods = calculateTotalPeriods(durationMonths, formData.payment_frequency, intervalDays);
  const amountPerPeriod = totalPeriods > 0 ? netAmount / totalPeriods : 0;

  setCalculatedValues({
    amountPerPeriod,
    totalPeriods,
    netAmount
  });
}, [
  formData.totalamount,
  formData.advancepaid,
  formData.advanceamount,
  formData.installmentdurationinmonths,
  formData.payment_frequency,
  formData.payment_interval_days
]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });

    if (message) {
      setMessage('');
    }
  };

  const getFrequencyLabel = () => {
    const option = paymentFrequencyOptions.find(opt => opt.value === formData.payment_frequency);
    return option ? option.label : 'Monthly';
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
      const advanceAmount = formData.advancepaid ? (parseFloat(formData.advanceamount) || 0) : 0;
      const intervalDays = formData.payment_frequency === 'custom' ? parseInt(formData.payment_interval_days) : null;

      // Validation
      if (!formData.installmenttitle.trim()) {
        throw new Error('Plan title is required');
      }
      
      if (isNaN(totalAmount) || totalAmount <= 0) {
        throw new Error('Total amount must be a positive number');
      }

      if (isNaN(duration) || duration <= 0) {
        throw new Error('Duration must be a positive number of months');
      }

      if (advanceAmount < 0) {
        throw new Error('Advance amount cannot be negative');
      }

      if (advanceAmount >= totalAmount) {
        throw new Error('Advance amount must be less than total amount');
      }

      if (formData.payment_frequency === 'custom' && (!intervalDays || intervalDays <= 0)) {
        throw new Error('Custom frequency requires valid interval days');
      }

      const installmentData = {
        installmenttitle: formData.installmenttitle.trim(),
        startdate: formData.startdate,
        installmentdurationinmonths: duration,
        payment_frequency: formData.payment_frequency,
        payment_interval_days: intervalDays,
        totalamount: totalAmount,
        advancepaid: formData.advancepaid,
        advanceamount: advanceAmount,
        description: formData.description.trim() || undefined,
        ...(editingInstallment?.installmentid && { installmentid: editingInstallment.installmentid })
      };

      const method = editingInstallment ? 'PUT' : 'POST';
      const response = await fetch('/api/installments', {
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
            payment_frequency: 'monthly',
            payment_interval_days: '',
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

        {/* Payment Frequency */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Payment Frequency *
          </label>
          <select
            name="payment_frequency"
            value={formData.payment_frequency}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          >
            {paymentFrequencyOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom interval days */}
        {formData.payment_frequency === 'custom' && (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Payment Interval (Days) *
            </label>
            <input
              type="number"
              name="payment_interval_days"
              value={formData.payment_interval_days}
              onChange={handleChange}
              required
              min="1"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="30"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              How many days between each payment
            </p>
          </div>
        )}

        {/* Total amount */}
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

        {/* Payment calculation preview */}
        {parseFloat(formData.totalamount) > 0 && parseInt(formData.installmentdurationinmonths) > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Payment Breakdown</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Payment Frequency:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{getFrequencyLabel()}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Amount per Payment:</span>
                <p className="font-medium text-blue-600 dark:text-blue-400">
                  ${calculatedValues.amountPerPeriod.toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Total Payments:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{calculatedValues.totalPeriods}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Net Amount:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  ${calculatedValues.netAmount.toFixed(2)}
                </p>
              </div>
            </div>
            {formData.payment_frequency === 'custom' && formData.payment_interval_days && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Payment every {formData.payment_interval_days} days
              </p>
            )}
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
            className="flex-1 bg-purple-500 dark:bg-purple-600 text-white py-2 px-4 rounded-md 
                       hover:bg-purple-600 dark:hover:bg-purple-700 focus:outline-none focus:ring-2 
                       focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Processing...' : (editingInstallment ? 'Update Plan' : 'Add Plan')}
          </button>
          
          {editingInstallment && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 
                         disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`p-3 rounded-md ${
            messageType === 'success' 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
};

export default AddInstallmentForm;