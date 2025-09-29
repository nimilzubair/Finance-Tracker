// components/InstallmentsOverview.tsx - FIXED overflow issue
'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Installment {
  installmentid: number;
  installmenttitle: string;
  startdate: string;
  installmentdurationinmonths: number;
  payment_frequency: string;
  payment_interval_days?: number;
  amountpermonth: number | string;
  advancepaid: boolean;
  advanceamount: number | string;
  totalamount: number | string;
  total_paid: number | string;
  remaining_amount: number | string;
  payments_made: number;
  periods_remaining?: number;
  status?: string;
  createdat: string;
}

const InstallmentsOverview = ({ showTitle = false }) => {
  const { token } = useAuth();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchInstallments();
    }
  }, [token]);

  const fetchInstallments = async () => {
    try {
      const response = await fetch('/api/installments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setInstallments(data.installments || []);
      } else {
        console.error('Failed to fetch installments:', response.status);
      }
    } catch (error) {
      console.error('Error fetching installments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format amount safely with abbreviations for large numbers
  const formatAmount = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '$0.00';
    
    // For very large numbers, use abbreviations
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(1)}B`;
    } else if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    } else {
      return `$${num.toFixed(2)}`;
    }
  };

  // Helper function for full amount display with proper formatting
  const formatFullAmount = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '$0.00';
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate progress percentage
  const calculateProgress = (paid: number | string, total: number | string): number => {
    const paidNum = typeof paid === 'string' ? parseFloat(paid) : paid;
    const totalNum = typeof total === 'string' ? parseFloat(total) : total;
    return totalNum > 0 ? (paidNum / totalNum) * 100 : 0;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format payment frequency for display
  const formatPaymentFrequency = (frequency: string, intervalDays?: number): string => {
    switch (frequency) {
      case 'monthly': return 'Monthly';
      case 'weekly': return 'Weekly';
      case 'bi-weekly': return 'Bi-Weekly';
      case 'quarterly': return 'Quarterly';
      case 'yearly': return 'Yearly';
      case 'custom': return intervalDays ? `Every ${intervalDays} days` : 'Custom';
      default: return 'Monthly';
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  // Calculate next payment amount based on frequency
  const getNextPaymentAmount = (installment: Installment): string => {
    const amountPerPeriod = typeof installment.amountpermonth === 'string' 
      ? parseFloat(installment.amountpermonth) 
      : installment.amountpermonth;
    return formatAmount(amountPerPeriod);
  };

  // Get periods remaining display text
  const getPeriodsRemainingText = (installment: Installment): string => {
    const periodsRemaining = installment.periods_remaining || 
      (installment.installmentdurationinmonths - installment.payments_made);
    
    switch (installment.payment_frequency) {
      case 'weekly':
        return `${periodsRemaining} weeks remaining`;
      case 'bi-weekly':
        return `${periodsRemaining} bi-weekly payments remaining`;
      case 'quarterly':
        return `${periodsRemaining} quarters remaining`;
      case 'yearly':
        return `${periodsRemaining} years remaining`;
      case 'custom':
        return `${periodsRemaining} payment periods remaining`;
      default:
        return `${periodsRemaining} months remaining`;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        {showTitle && <h2 className="text-xl font-semibold mb-4 text-blue-800 dark:text-blue-200">Installments Overview</h2>}
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Loading installments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      {showTitle && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200">Installment Plans</h2>
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
            Total: {installments.length} plans
          </span>
        </div>
      )}
      
      {installments.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No installment plans recorded
        </p>
      ) : (
        <div className="space-y-4">
          {installments.map((installment) => {
            const progress = calculateProgress(installment.total_paid, installment.totalamount);
            const nextPaymentAmount = getNextPaymentAmount(installment);
            const periodsRemainingText = getPeriodsRemainingText(installment);
            
            return (
              <div key={installment.installmentid} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Header with title and status */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0"> {/* Added flex-1 min-w-0 for proper truncation */}
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 text-lg truncate">
                      {installment.installmenttitle}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {installment.status && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(installment.status)}`}>
                          {installment.status.charAt(0).toUpperCase() + installment.status.slice(1)}
                        </span>
                      )}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatPaymentFrequency(installment.payment_frequency, installment.payment_interval_days)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0"> {/* Added flex-shrink-0 */}
                    <div className="text-blue-600 dark:text-blue-400 font-semibold text-lg">
                      {nextPaymentAmount}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      per {installment.payment_frequency === 'custom' ? 'period' : installment.payment_frequency.replace('-', ' ')}
                    </div>
                  </div>
                </div>
                
                {/* Payment info and dates */}
                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Started:</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(installment.startdate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Payments:</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {installment.payments_made} of {installment.installmentdurationinmonths}
                    </p>
                  </div>
                </div>

                {/* Progress section */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                    <span>Paid: {formatAmount(installment.total_paid)}</span>
                    <span>Total: {formatAmount(installment.totalamount)}</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        progress === 100 
                          ? 'bg-green-500' 
                          : progress > 75 
                          ? 'bg-blue-500' 
                          : progress > 50 
                          ? 'bg-yellow-500' 
                          : 'bg-orange-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{progress.toFixed(1)}% completed</span>
                    <span className="text-right">{periodsRemainingText}</span>
                  </div>
                </div>
                
                {/* Advance payment indicator */}
                {installment.advancepaid && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-yellow-600 dark:text-yellow-400">💰</span>
                      <span className="text-yellow-800 dark:text-yellow-200">
                        Advance paid: {formatAmount(installment.advanceamount)}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Summary footer */}
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div>
                    <span>Remaining: </span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {formatAmount(installment.remaining_amount)}
                    </span>
                  </div>
                  <div>
                    Created: {formatDate(installment.createdat)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Summary stats - FIXED layout for large numbers */}
      {installments.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"> {/* Changed from grid-cols-3 to responsive */}
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {installments.filter(i => i.status === 'active').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Active</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {installments.filter(i => i.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Completed</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg"> {/* Added padding and background */}
              <div className="text-xl font-bold text-gray-600 dark:text-gray-400 break-words"> {/* Added break-words */}
                {formatAmount(installments.reduce((sum, inst) => {
                  const remaining = typeof inst.remaining_amount === 'string' 
                    ? parseFloat(inst.remaining_amount) 
                    : inst.remaining_amount;
                  return sum + remaining;
                }, 0))}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Remaining</div>
              {/* Full amount on hover */}
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1" title={formatFullAmount(installments.reduce((sum, inst) => {
                const remaining = typeof inst.remaining_amount === 'string' 
                  ? parseFloat(inst.remaining_amount) 
                  : inst.remaining_amount;
                return sum + remaining;
              }, 0))}>
                Hover for exact amount
              </div>
            </div>
          </div>
        </div>
      )}
      
      <button 
        onClick={fetchInstallments}
        className="mt-4 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium flex items-center gap-2"
        disabled={loading}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            Refreshing...
          </>
        ) : (
          <>
            🔄 Refresh
          </>
        )}
      </button>
    </div>
  );
};

export default InstallmentsOverview;