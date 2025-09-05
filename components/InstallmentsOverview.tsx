// components/InstallmentsOverview.tsx
'use client';
import React, { useState, useEffect } from 'react';

interface Installment {
  installmentid: number;
  installmenttitle: string;
  startdate: string;
  installmentdurationinmonths: number;
  amountpermonth: number | string;
  advancepaid: boolean;
  advanceamount: number | string;
  totalamount: number | string;
  total_paid: number | string;
  remaining_amount: number | string;
  payments_made: number;
  createdat: string;
}

const InstallmentsOverview = ({ showTitle = false }) => {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstallments();
  }, []);

  const fetchInstallments = async () => {
    try {
      const response = await fetch('/api/installments?userId=1'); // Using userId=1 for now
      if (response.ok) {
        const data = await response.json();
        setInstallments(data);
      }
    } catch (error) {
      console.error('Error fetching installments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format amount safely
  const formatAmount = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${num.toFixed(2)}`;
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

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        {showTitle && <h2 className="text-xl font-semibold mb-4 text-blue-800 dark:text-blue-200">Installments Overview</h2>}
        <p className="text-gray-700 dark:text-gray-300">Loading...</p>
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
        <p className="text-gray-500 dark:text-gray-400">No installment plans recorded</p>
      ) : (
        <div className="space-y-4">
          {installments.map((installment) => {
            const progress = calculateProgress(installment.total_paid, installment.totalamount);
            const monthsLeft = installment.installmentdurationinmonths - installment.payments_made;
            
            return (
              <div key={installment.installmentid} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{installment.installmenttitle}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Started: {formatDate(installment.startdate)} • {installment.payments_made}/{installment.installmentdurationinmonths} payments
                    </p>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    {formatAmount(installment.amountpermonth)}/month
                  </span>
                </div>
                
                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                    <span>Paid: {formatAmount(installment.total_paid)}</span>
                    <span>Total: {formatAmount(installment.totalamount)}</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{progress.toFixed(0)}% completed</span>
                    <span>{monthsLeft} months remaining</span>
                  </div>
                </div>
                
                {installment.advancepaid && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded px-3 py-1 text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                    Advance paid: {formatAmount(installment.advanceamount)}
                  </div>
                )}
                
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Remaining: {formatAmount(installment.remaining_amount)}</span>
                  <span>Created: {formatDate(installment.createdat)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <button 
        onClick={fetchInstallments}
        className="mt-4 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
      >
        Refresh
      </button>
    </div>
  );
};

export default InstallmentsOverview;