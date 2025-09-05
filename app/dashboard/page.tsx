// app/dashboard/page.tsx
'use client';
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import SummaryCard from '@/components/SummaryCard';
import AddExpenseForm from '@/components/AddExpenseForm';
import RecentExpenses from '@/components/RecentExpenses';
import LoansOverview from '@/components/LoansOverview';
import AddLoanForm from '@/components/AddLoanForm';
import InstallmentsOverview from '@/components/InstallmentsOverview';
import AddInstallmentForm from '@/components/AddInstallmentForm';
import { useAuth } from '@/context/AuthContext';

interface SummaryData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netCashFlow: number;
}

interface Expense {
  expensetitle: string;
  amount: number | string;
  paiddate: string;
  createdat: string;
}

interface Loan {
  loanid: number;
  loantitle: string;
  totalamount: number;
  amountpaid: number;
  amountleft: number;
  createdat: string;
}

interface Installment {
  installmentid: number;
  installmenttitle: string;
  totalamount: number;
  total_paid: number;
  remaining_amount: number;
  payments_made: number;
  startdate: string;
  installmentdurationinmonths: number;
}

const BalanceIcon = () => <span>💰</span>;
const IncomeIcon = () => <span>📥</span>;
const ExpensesIcon = () => <span>📤</span>;
const NetFlowIcon = () => <span>📊</span>;

const Dashboard = () => {
  const { user } = useAuth();
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSubTab, setActiveSubTab] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<any[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [loadingInstallments, setLoadingInstallments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSummaryData();
      fetchUpcomingPayments();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      if (activeTab === 'expenses' && (!activeSubTab || activeSubTab === 'view')) {
        fetchAllExpenses();
      } else if (activeTab === 'loans' && (!activeSubTab || activeSubTab === 'view')) {
        fetchAllLoans();
      } else if (activeTab === 'installments' && (!activeSubTab || activeSubTab === 'view')) {
        fetchAllInstallments();
      }
    }
  }, [activeTab, activeSubTab, user]);

  const fetchSummaryData = async () => {
    try {
      const response = await fetch('/api/summary', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSummaryData(data);
      } else {
        setError('Failed to fetch summary data');
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
      setError('Error fetching summary data');
    }
  };

  const fetchUpcomingPayments = async () => {
    try {
      const res = await fetch('/api/installments/upcoming', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUpcomingPayments(data);
      }
    } catch (err) {
      console.error('Error fetching upcoming payments', err);
    }
  };

  const fetchAllExpenses = async () => {
    setLoadingExpenses(true);
    setError(null);
    try {
      const res = await fetch('/api/expenses', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      } else {
        setError('Failed to fetch expenses');
      }
    } catch (err) {
      console.error('Error fetching expenses', err);
      setError('Error fetching expenses');
    } finally {
      setLoadingExpenses(false);
    }
  };

  const fetchAllLoans = async () => {
    setLoadingLoans(true);
    setError(null);
    try {
      const res = await fetch('/api/loans', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoans(data);
      } else {
        setError('Failed to fetch loans');
      }
    } catch (err) {
      console.error('Error fetching loans', err);
      setError('Error fetching loans');
    } finally {
      setLoadingLoans(false);
    }
  };

  const fetchAllInstallments = async () => {
    setLoadingInstallments(true);
    setError(null);
    try {
      const res = await fetch('/api/installments', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInstallments(data);
      } else {
        setError('Failed to fetch installments');
      }
    } catch (err) {
      console.error('Error fetching installments', err);
      setError('Error fetching installments');
    } finally {
      setLoadingInstallments(false);
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setActiveSubTab('');
    setError(null);
  };

  const formatAmount = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-extrabold mb-6 text-blue-800 dark:text-blue-200">
          Financial Overview
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            title="Total Balance"
            value={summaryData ? `$${summaryData.totalBalance.toFixed(2)}` : 'Loading...'}
            icon={<BalanceIcon />}
          />
          <SummaryCard
            title="Monthly Income"
            value={summaryData ? `$${summaryData.monthlyIncome.toFixed(2)}` : 'Loading...'}
            icon={<IncomeIcon />}
          />
          <SummaryCard
            title="Monthly Expenses"
            value={summaryData ? `$${summaryData.monthlyExpenses.toFixed(2)}` : 'Loading...'}
            icon={<ExpensesIcon />}
          />
          <SummaryCard
            title="Net Cash Flow"
            value={summaryData ? `$${summaryData.netCashFlow.toFixed(2)}` : 'Loading...'}
            icon={<NetFlowIcon />}
          />
        </div>

        {/* Upcoming Payments */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
            Upcoming Payments
          </h2>
          {upcomingPayments.length === 0 ? (
            <p className="text-gray-700 dark:text-gray-300">No upcoming payments</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {upcomingPayments.map((payment, idx) => (
                <li key={idx} className="py-2 flex justify-between">
                  <span>{payment.installmenttitle}</span>
                  <span className="text-red-600">${formatAmount(payment.amountdue)}</span>
                  <span>{formatDate(payment.duedate)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'expenses', label: 'Expenses' },
            { id: 'loans', label: 'Loans' },
            { id: 'installments', label: 'Installments' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`px-6 py-3 font-medium whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-300'
              }`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
                Recent Expenses
              </h2>
              <RecentExpenses showTitle={false} />
            </div>
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
                  Loan Overview
                </h2>
                <LoansOverview />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
                  Installment Plans
                </h2>
                <InstallmentsOverview />
              </div>
            </div>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <>
            {(!activeSubTab || activeSubTab === 'view') && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
                  All Expenses (This Month)
                </h2>
                {loadingExpenses ? (
                  <p className="text-gray-500">Loading expenses...</p>
                ) : expenses.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No expenses recorded this month</p>
                    <button
                      onClick={() => setActiveSubTab('add')}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                    >
                      Add Your First Expense
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700">
                        {expenses.map((exp, idx) => (
                          <tr key={idx}>
                            <td className="px-6 py-4">{exp.expensetitle}</td>
                            <td className="px-6 py-4">{formatDate(exp.paiddate)}</td>
                            <td className="px-6 py-4 text-red-600">-${formatAmount(exp.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {activeSubTab === 'add' && (
              <div className="max-w-md mx-auto">
                <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
                  Add New Expense
                </h2>
                <AddExpenseForm onSuccess={() => {
                  setActiveSubTab('view');
                  fetchAllExpenses();
                  fetchSummaryData();
                }} />
              </div>
            )}
          </>
        )}

        {/* Loans Tab */}
        {activeTab === 'loans' && (
          <>
            {(!activeSubTab || activeSubTab === 'view') && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
                  All Loans
                </h2>
                {loadingLoans ? (
                  <p className="text-gray-500">Loading loans...</p>
                ) : loans.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No loans recorded</p>
                    <button
                      onClick={() => setActiveSubTab('add')}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                    >
                      Add Your First Loan
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700">
                        {loans.map((loan) => (
                          <tr key={loan.loanid}>
                            <td className="px-6 py-4">{loan.loantitle}</td>
                            <td className="px-6 py-4">${formatAmount(loan.totalamount)}</td>
                            <td className="px-6 py-4">${formatAmount(loan.amountpaid)}</td>
                            <td className="px-6 py-4">${formatAmount(loan.amountleft)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {activeSubTab === 'add' && (
              <div className="max-w-md mx-auto">
                <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
                  Add New Loan
                </h2>
                <AddLoanForm onSuccess={() => {
                  setActiveSubTab('view');
                  fetchAllLoans();
                  fetchSummaryData();
                }} />
              </div>
            )}
          </>
        )}

        {/* Installments Tab */}
        {activeTab === 'installments' && (
          <>
            {(!activeSubTab || activeSubTab === 'view') && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
                  All Installment Plans
                </h2>
                {loadingInstallments ? (
                  <p className="text-gray-500">Loading installments...</p>
                ) : installments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No installment plans recorded</p>
                    <button
                      onClick={() => setActiveSubTab('add')}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                    >
                      Add Your First Installment
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payments</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700">
                        {installments.map((inst) => (
                          <tr key={inst.installmentid}>
                            <td className="px-6 py-4">{inst.installmenttitle}</td>
                            <td className="px-6 py-4">${formatAmount(inst.totalamount)}</td>
                            <td className="px-6 py-4">${formatAmount(inst.total_paid)}</td>
                            <td className="px-6 py-4">${formatAmount(inst.remaining_amount)}</td>
                            <td className="px-6 py-4">{inst.payments_made}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {activeSubTab === 'add' && (
              <div className="max-w-md mx-auto">
                <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
                  Add New Installment Plan
                </h2>
                <AddInstallmentForm onSuccess={() => {
                  setActiveSubTab('view');
                  fetchAllInstallments();
                  fetchSummaryData();
                  fetchUpcomingPayments();
                }} />
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
