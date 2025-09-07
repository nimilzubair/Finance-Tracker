// components/LoansOverview.tsx - FIXED
'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Loan {
  loanid: number;
  loantitle: string;
  totalamount: number | string;
  amountpaid: number | string;
  amountleft: number | string;
  createdat: string;
}

const LoansOverview = ({ showTitle = false }) => {
  const { token } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchLoans();
    }
  }, [token]);

  const fetchLoans = async () => {
    try {
      const response = await fetch('/api/loans', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setLoans(data);
      } else {
        console.error('Failed to fetch loans:', response.status);
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format amount safely
  const formatAmount = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${num.toFixed(2)}`;
  };

  // Calculate total remaining debt
  const totalRemaining = loans.reduce((total, loan) => {
    const amount = typeof loan.amountleft === 'string' ? parseFloat(loan.amountleft) : loan.amountleft;
    return total + amount;
  }, 0);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        {showTitle && <h2 className="text-xl font-semibold mb-4 text-blue-800 dark:text-blue-200">Loans Overview</h2>}
        <p className="text-gray-700 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      {showTitle && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200">Loans Overview</h2>
          <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-3 py-1 rounded-full text-sm font-medium">
            Total: {formatAmount(totalRemaining)}
          </span>
        </div>
      )}
      
      {loans.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No loans recorded</p>
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => {
            const paid = typeof loan.amountpaid === 'string' ? parseFloat(loan.amountpaid) : loan.amountpaid;
            const total = typeof loan.totalamount === 'string' ? parseFloat(loan.totalamount) : loan.totalamount;
            const progress = total > 0 ? (paid / total) * 100 : 0;
            
            return (
              <div key={loan.loanid} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{loan.loantitle}</h3>
                  <span className="text-red-600 dark:text-red-400 font-semibold">
                    {formatAmount(loan.amountleft)} left
                  </span>
                </div>
                
                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                    <span>Paid: {formatAmount(loan.amountpaid)}</span>
                    <span>Total: {formatAmount(loan.totalamount)}</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Created: {new Date(loan.createdat).toLocaleDateString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
      
      <button 
        onClick={fetchLoans}
        className="mt-4 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
      >
        Refresh
      </button>
    </div>
  );
};

export default LoansOverview;