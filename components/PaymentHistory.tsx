// components/PaymentHistory.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';

interface Payment {
  installmentdetailid: number;
  installmentid: number;
  amountpaid: number | string;
  paiddate: string;
  is_advance: boolean;
  payment_period?: number;
  createdat: string;
}

interface PaymentHistoryProps {
  installmentId: number;
  onPaymentRecorded?: () => void;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ 
  installmentId, 
  onPaymentRecorded 
}) => {
  const { token } = useAuth();
  const { formatCurrency } = useCurrency();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);

  useEffect(() => {
    if (token && installmentId) {
      fetchPaymentHistory();
    }
  }, [token, installmentId]);

  const fetchPaymentHistory = async () => {
    try {
      const response = await fetch(`/api/installments/payment?installmentid=${installmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      } else {
        console.error('Failed to fetch payment history:', response.status);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handlePaymentRecorded = () => {
    fetchPaymentHistory();
    setShowLogForm(false);
    if (onPaymentRecorded) {
      onPaymentRecorded();
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Loading payment history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
          Payment History
        </h3>
        <button
          onClick={() => setShowLogForm(!showLogForm)}
          className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
        >
          {showLogForm ? 'Hide Form' : 'Log Payment'}
        </button>
      </div>

      {showLogForm && (
        <div className="mb-6">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Payment form will be implemented here
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No payments recorded yet
          </p>
          <button
            onClick={() => setShowLogForm(true)}
            className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
          >
            Record First Payment
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Amount
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Type
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Period
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {payments.map((payment) => {
                const num = typeof payment.amountpaid === 'string'
                  ? parseFloat(payment.amountpaid)
                  : payment.amountpaid;

                return (
                  <tr key={payment.installmentdetailid} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(payment.paiddate)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(num)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        payment.is_advance
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                      }`}>
                        {payment.is_advance ? 'Advance' : 'Regular'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {payment.payment_period || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <td className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Total
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(
                    payments.reduce((sum, payment) => {
                      const amount = typeof payment.amountpaid === 'string' 
                        ? parseFloat(payment.amountpaid) 
                        : payment.amountpaid;
                      return sum + amount;
                    }, 0)
                  )}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="mt-4 flex justify-between items-center">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {payments.length} payment{payments.length !== 1 ? 's' : ''} total
        </span>
        <button
          onClick={fetchPaymentHistory}
          className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium flex items-center gap-2"
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
    </div>
  );
};

export default PaymentHistory;
