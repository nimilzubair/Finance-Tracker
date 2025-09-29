// components/InstallmentItem.tsx - ENHANCED with payment frequency display
'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FiEdit2, FiTrash2, FiDollarSign, FiCalendar, FiClock, FiRefreshCw } from 'react-icons/fi';

interface Installment {
  installmentid: number;
  installmenttitle: string;
  totalamount: number;
  total_paid: number;
  remaining_amount: number;
  payments_made: number;
  periods_remaining: number;
  startdate: string;
  installmentdurationinmonths: number;
  payment_frequency?: string;
  payment_interval_days?: number;
  amountpermonth?: number;
  advancepaid: boolean;
  advanceamount: number;
  description?: string;
  status: string;
}

interface InstallmentItemProps {
  installment: Installment;
  onEdit: (installment: Installment) => void;
  onDelete: (installmentId: number) => void;
  onRefresh: () => void;
}

const InstallmentItem: React.FC<InstallmentItemProps> = ({ 
  installment, 
  onEdit, 
  onDelete, 
  onRefresh 
}) => {
  const { token } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this installment plan? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/installments/${installment.installmentid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        onDelete(installment.installmentid);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to delete installment');
      }
    } catch (error: any) {
      alert(error.message || 'Error deleting installment plan');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/installments/${installment.installmentid}/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        onRefresh();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to refresh installment');
      }
    } catch (error: any) {
      alert(error.message || 'Error refreshing installment plan');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getFrequencyLabel = () => {
    switch (installment.payment_frequency) {
      case 'monthly':
        return 'Monthly';
      case 'weekly':
        return 'Weekly';
      case 'bi-weekly':
        return 'Bi-Weekly';
      case 'quarterly':
        return 'Quarterly';
      case 'yearly':
        return 'Yearly';
      case 'custom':
        return `Every ${installment.payment_interval_days} days`;
      default:
        return 'Monthly';
    }
  };

  const getProgressPercentage = () => {
    return (installment.total_paid / installment.totalamount) * 100;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 'completed':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
      case 'overdue':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {installment.installmenttitle}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(installment.status)}`}>
              {installment.status}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <FiRefreshCw className="w-3 h-3" />
              {getFrequencyLabel()}
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(installment)}
            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
            title="Edit plan"
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors disabled:opacity-50"
            title="Refresh status"
          >
            <FiRefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors disabled:opacity-50"
            title="Delete plan"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
          <span>Progress: {getProgressPercentage().toFixed(1)}%</span>
          <span>${installment.total_paid.toFixed(2)} of ${installment.totalamount.toFixed(2)}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <FiDollarSign className="w-4 h-4 text-blue-500" />
          <div>
            <p className="text-gray-600 dark:text-gray-400">Per Payment</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              ${installment.amountpermonth?.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <FiClock className="w-4 h-4 text-purple-500" />
          <div>
            <p className="text-gray-600 dark:text-gray-400">Remaining</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {installment.periods_remaining} payments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <FiCalendar className="w-4 h-4 text-green-500" />
          <div>
            <p className="text-gray-600 dark:text-gray-400">Started</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {formatDate(installment.startdate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <div className="w-4 h-4 flex items-center justify-center">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Advance</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              ${installment.advanceamount.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      {installment.description && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {installment.description}
          </p>
        </div>
      )}

      {/* Remaining Amount */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Remaining:</span>
          <span className="text-lg font-bold text-red-600 dark:text-red-400">
            ${installment.remaining_amount.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default InstallmentItem;