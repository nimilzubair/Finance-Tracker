// components/LogPaymentForm.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Installment {
  installmentid: number;
  installmenttitle: string;
  totalamount: number | string;
  total_paid: number | string;
  remaining_amount: number | string;
  amountpermonth?: number | string;
  payment_frequency?: string;
  next_payment_period?: number;
  next_due_date?: string;
}

interface LogPaymentFormProps {
  installment: Installment;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const LogPaymentForm: React.FC<LogPaymentFormProps> = ({ 
  installment, 
  onSuccess, 
  onCancel 
}) => {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    amountpaid: installment.amountpermonth?.toString() || '',
    paiddate: new Date().toISOString().split('T')[0],
    is_advance: false,
    payment_period: installment.next_payment_period || 1
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const remainingAmount = typeof installment.remaining_amount === 'string' 
    ? parseFloat(installment.remaining_amount) 
    : installment.remaining_amount;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setMessage('User not authenticated');
      setMessageType('error');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const amountNum = parseFloat(formData.amountpaid);
      
      // Validation
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Amount must be a positive number');
      }

      if (amountNum > remainingAmount) {
        throw new Error(`Amount cannot exceed remaining balance of $${remainingAmount.toFixed(2)}`);
      }

      const paymentData = {
        installmentid: installment.installmentid,
        amountpaid: amountNum,
        paiddate: formData.paiddate,
        is_advance: formData.is_advance,
        payment_period: formData.is_advance ? undefined : formData.payment_period
      };

      const response = await fetch('/api/installments/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Payment recorded successfully!');
        setMessageType('success');
        
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        throw new Error(data.error || data.message || 'Failed to record payment');
      }
    } catch (error: any) {
      setMessage(error.message || 'Error recording payment');
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-blue-600 dark:text-blue-400">
        Log Payment - {installment.installmenttitle}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Payment Amount */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Amount ($) *
          </label>
          <input
            type="number"
            name="amountpaid"
            value={formData.amountpaid}
            onChange={handleChange}
            required
            step="0.01"
            min="0.01"
            max={remainingAmount}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Remaining balance: ${remainingAmount.toFixed(2)}
          </p>
        </div>

        {/* Payment Date */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Payment Date *
          </label>
          <input
            type="date"
            name="paiddate"
            value={formData.paiddate}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Advance Payment Toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="is_advance"
            checked={formData.is_advance}
            onChange={handleChange}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
            id="is_advance"
            disabled={isSubmitting}
          />
          <label htmlFor="is_advance" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            This is an advance payment
          </label>
        </div>

        {/* Payment Period (only show for regular payments) */}
        {!formData.is_advance && (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Payment Period
            </label>
            <select
              name="payment_period"
              value={formData.payment_period}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              {Array.from({ length: installment.installmentdurationinmonths }, (_, i) => i + 1).map(period => (
                <option key={period} value={period}>
                  Period {period}
                </option>
              ))}
            </select>
          </div>
        )}

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
            {isSubmitting ? 'Processing...' : 'Record Payment'}
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

export default LogPaymentForm;