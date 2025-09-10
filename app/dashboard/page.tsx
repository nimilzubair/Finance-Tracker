// app/dashboard/page.tsx - UPDATED WITH FULL CRUD FUNCTIONALITY
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
import AddIncomeForm from '@/components/AddIncomeForm';
import { useAuth } from '@/context/AuthContext';

interface SummaryData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netCashFlow: number;
}

interface Expense {
  expenseid?: number;
  expensetitle: string;
  amount: number | string;
  paiddate: string;
  createdat: string;
  category?: string;
  description?: string;
}

interface Income {
  incomeid?: number;
  incometitle: string;
  amount: number | string;
  income_date: string;
  createdat: string;
  description?: string;
}

interface Loan {
  loanid?: number;
  loantitle: string;
  totalamount: number | string;
  amountpaid?: number | string;
  amountleft?: number | string;
  createdat?: string;
  description?: string;
}

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
  createdat?: string;
}

interface UpcomingPayment {
  installmentid: number;
  installmenttitle: string;
  amountdue: number;
  duedate: string;
}

interface EditingItem {
  type: 'expense' | 'income' | 'loan' | 'installment';
  data: Expense | Income | Loan | Installment;
}

// Icon components with fallback
const BalanceIcon = () => <span>💰</span>;
const IncomeIcon = () => <span>📈</span>;
const ExpensesIcon = () => <span>📉</span>;
const NetFlowIcon = () => <span>📊</span>;

// Type guard functions
const isExpense = (item: any): item is Expense => {
  return item && typeof item.expensetitle === 'string';
};

const isLoan = (item: any): item is Loan => {
  return item && typeof item.loantitle === 'string';
};

const isInstallment = (item: any): item is Installment => {
  return item && typeof item.installmenttitle === 'string';
};

const isIncome = (item: any): item is Income => {
  return item && typeof item.incometitle === 'string';
};

const Dashboard = () => {
  const { user, token } = useAuth();
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

  // ✅ Start with stable defaults so server and client match
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [activeSubTab, setActiveSubTab] = useState<string>('');

  // ✅ Sync with URL after the component mounts (client only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab');
    const urlSubTab = params.get('subtab');

    if (urlTab) setActiveTab(urlTab);
    if (urlSubTab) setActiveSubTab(urlSubTab);
  }, []);


  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingIncomes, setLoadingIncomes] = useState(false);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [loadingInstallments, setLoadingInstallments] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);

  // Populate available years
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i);
    }
    setAvailableYears(years);
  }, []);

  // Authentication check
  useEffect(() => {
    if (user && token) {
      fetchSummaryData();
      fetchUpcomingPayments();
    } else if (user === null && token === null) {
      setLoadingSummary(false);
    }
  }, [user, token]);

  // Tab-specific data loading
  useEffect(() => {
    if (user && token) {
      if (activeTab === 'expenses' && (!activeSubTab || activeSubTab === 'view')) {
        fetchAllExpenses();
      } else if (activeTab === 'income' && (!activeSubTab || activeSubTab === 'view')) {
        fetchAllIncomes();
      } else if (activeTab === 'loans' && (!activeSubTab || activeSubTab === 'view')) {
        fetchAllLoans();
      } else if (activeTab === 'installments' && (!activeSubTab || activeSubTab === 'view')) {
        fetchAllInstallments();
      }
    }
  }, [activeTab, activeSubTab, user, token, selectedMonth, selectedYear]);

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    if (!token) throw new Error('No authentication token available');
    
    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  };

  const fetchSummaryData = async () => {
    setLoadingSummary(true);
    setError(null);
    try {
      const response = await makeAuthenticatedRequest('/api/summary');
      if (response.ok) {
        const data = await response.json();
        setSummaryData(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch summary: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
      }
    } catch (error: any) {
      console.error('Error fetching summary:', error);
      setError(error.message || 'Failed to load financial summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchUpcomingPayments = async () => {
    try {
      const res = await makeAuthenticatedRequest('/api/installments/upcoming');
      if (res.ok) {
        const data = await res.json();
        setUpcomingPayments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching upcoming payments', err);
    }
  };

  const fetchAllExpenses = async () => {
    setLoadingExpenses(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString()
      });
      console.log("Params month: ", params.get("month"));
      console.log("Params year: ", params.get("year"));
      const res = await makeAuthenticatedRequest(`/api/expenses/all?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(Array.isArray(data) ? data : []);
      } else {
        throw new Error(`Failed to fetch expenses: ${res.status}`);
      }
    } catch (err: any) {
      console.error('Error fetching expenses', err);
      setError('Failed to load expenses');
    } finally {
      setLoadingExpenses(false);
    }
  };

  const fetchAllIncomes = async () => {
    setLoadingIncomes(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString()
      });
      
      const res = await makeAuthenticatedRequest(`/api/income?${params}`);
      if (res.ok) {
        const data = await res.json();
        setIncomes(Array.isArray(data) ? data : []);
      } else {
        throw new Error(`Failed to fetch income: ${res.status}`);
      }
    } catch (err: any) {
      console.error('Error fetching income', err);
      setError('Failed to load income');
    } finally {
      setLoadingIncomes(false);
    }
  };

  const fetchAllLoans = async () => {
    setLoadingLoans(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        month: selectedMonth === 0 ? '' : selectedMonth.toString(),
        year: selectedYear === 0 ? '' : selectedYear.toString()
      });
      
      const res = await makeAuthenticatedRequest(`/api/loans?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLoans(Array.isArray(data) ? data : []);
      } else {
        throw new Error(`Failed to fetch loans: ${res.status}`);
      }
    } catch (err: any) {
      console.error('Error fetching loans', err);
      setError('Failed to load loans');
    } finally {
      setLoadingLoans(false);
    }
  };

  const fetchAllInstallments = async () => {
    setLoadingInstallments(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        month: selectedMonth === 0 ? '' : selectedMonth.toString(),
        year: selectedYear === 0 ? '' : selectedYear.toString()
      });
      
      const res = await makeAuthenticatedRequest(`/api/installments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInstallments(Array.isArray(data) ? data : []);
      } else {
        throw new Error(`Failed to fetch installments: ${res.status}`);
      }
    } catch (err: any) {
      console.error('Error fetching installments', err);
      setError('Failed to load installments');
    } finally {
      setLoadingInstallments(false);
    }
  };

  const handleDeleteItem = async (type: string, id: number | undefined) => {
  if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

  try {
    let endpoint = '';
    switch (type) {
      case 'expense':
        endpoint = '/api/expenses/all';
        break;
      case 'income':
        endpoint = '/api/income';
        break;
      case 'loan':
        endpoint = '/api/loans';
        break;
      case 'installment':
        endpoint = '/api/installments';
        break;
      default:
        return;
    }

    const res = await makeAuthenticatedRequest(endpoint, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Send the ID in the request body based on the type
        expenseid: type === 'expense' ? id : undefined,
        incomeid: type === 'income' ? id : undefined,
        loanid: type === 'loan' ? id : undefined,
        installmentid: type === 'installment' ? id : undefined,
      }),
    });

    if (res.ok) {
      // Refresh the data
      switch (type) {
        case 'expense':
          fetchAllExpenses();
          break;
        case 'income':
          fetchAllIncomes();
          break;
        case 'loan':
          fetchAllLoans();
          break;
        case 'installment':
          fetchAllInstallments();
          break;
      }
      fetchSummaryData();
      setError(null);
    } else {
      throw new Error(`Failed to delete ${type}`);
    }
  } catch (err: any) {
    console.error(`Error deleting ${type}:`, err);
    setError(`Failed to delete ${type}`);
  }
};

  const handleEditItem = (type: 'expense' | 'income' | 'loan' | 'installment', data: any) => {
    // Validate the data type before setting
    if (
      (type === 'expense' && isExpense(data)) ||
      (type === 'income' && isIncome(data)) ||
      (type === 'loan' && isLoan(data)) ||
      (type === 'installment' && isInstallment(data))
    ) {
      setEditingItem({ type, data });
      handleSubTabChange('add');
    } else {
      console.error('Invalid data type for editing:', type, data);
      setError('Invalid data for editing');
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    handleSubTabChange('view');
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setActiveSubTab('');
    setError(null);
    setEditingItem(null);
    
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      url.searchParams.delete('subtab');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleSubTabChange = (subTabId: string) => {
    setActiveSubTab(subTabId);
    if (subTabId !== 'add') {
      setEditingItem(null);
    }
    
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      if (subTabId) {
        url.searchParams.set('subtab', subTabId);
      } else {
        url.searchParams.delete('subtab');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  const formatAmount = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-extrabold mb-6 text-blue-800 dark:text-blue-200">
          Financial Dashboard
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            title="Total Balance"
            value={summaryData ? `$${summaryData.totalBalance.toFixed(2)}` : loadingSummary ? 'Loading...' : 'N/A'}
            icon={<BalanceIcon />}
          />
          <SummaryCard
            title="Monthly Income"
            value={summaryData ? `$${summaryData.monthlyIncome.toFixed(2)}` : loadingSummary ? 'Loading...' : 'N/A'}
            icon={<IncomeIcon />}
          />
          <SummaryCard
            title="Monthly Expenses"
            value={summaryData ? `$${summaryData.monthlyExpenses.toFixed(2)}` : loadingSummary ? 'Loading...' : 'N/A'}
            icon={<ExpensesIcon />}
          />
          <SummaryCard
            title="Net Cash Flow"
            value={summaryData ? `$${summaryData.netCashFlow.toFixed(2)}` : loadingSummary ? 'Loading...' : 'N/A'}
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
            <div className="space-y-2">
              {upcomingPayments.map((payment, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="font-medium">{payment.installmenttitle}</span>
                  <span className="text-red-600 font-semibold">${formatAmount(payment.amountdue)}</span>
                  <span className="text-sm text-gray-500">{formatDate(payment.duedate)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'income', label: 'Income' },
            { id: 'expenses', label: 'Expenses' },
            { id: 'loans', label: 'Loans' },
            { id: 'installments', label: 'Installments' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`px-6 py-3 font-medium whitespace-nowrap transition-colors ${
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

        {/* Tab Content */}
        <div className="min-h-[400px]">
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

          {/* Income Tab */}
          {activeTab === 'income' && (
            <>
              {/* Sub-tab navigation */}
              <div className="flex gap-4 mb-4">
                <button
                  className={`px-4 py-2 rounded-md transition-colors ${
                    (!activeSubTab || activeSubTab === 'view')
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => handleSubTabChange('')}
                >
                  View Income
                </button>
                <button
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeSubTab === 'add'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => handleSubTabChange('add')}
                >
                  {editingItem ? 'Edit Income' : 'Add Income'}
                </button>
              </div>

              {(!activeSubTab || activeSubTab === 'view') && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                      All Income
                    </h2>
                    <div className="flex gap-2">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value={0}>All Months</option>
                        <option value={1}>January</option>
                        <option value={2}>February</option>
                        <option value={3}>March</option>
                        <option value={4}>April</option>
                        <option value={5}>May</option>
                        <option value={6}>June</option>
                        <option value={7}>July</option>
                        <option value={8}>August</option>
                        <option value={9}>September</option>
                        <option value={10}>October</option>
                        <option value={11}>November</option>
                        <option value={12}>December</option>
                      </select>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value={0}>All Years</option>
                        {availableYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <button
                        onClick={fetchAllIncomes}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                  {loadingIncomes ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <span className="ml-2">Loading income...</span>
                    </div>
                  ) : incomes.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">
                        {selectedMonth === 0 && selectedYear === 0 
                          ? 'No income recorded' 
                          : `No income found for ${selectedMonth === 0 ? 'all months' : new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' })} ${selectedYear === 0 ? 'all years' : selectedYear}`
                        }
                      </p>
                      <button
                        onClick={() => handleSubTabChange('add')}
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                      >
                        Add Your First Income
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
                      <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {incomes.map((income, index) => (
                            <tr key={income.incomeid ?? `income-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                {income.incometitle}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                {formatDate(income.income_date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                                ${formatAmount(income.amount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditItem('income', income)}
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem('income', income.incomeid!)}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100 dark:bg-gray-700">
                          <tr>
                            <td colSpan={2} className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                              Total
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-green-600 dark:text-green-400">
                              ${formatAmount(incomes.reduce((sum, income) => sum + (typeof income.amount === 'string' ? parseFloat(income.amount) : income.amount), 0))}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {activeSubTab === 'add' && (
                <div className="max-w-md mx-auto">
                  <AddIncomeForm 
                    editingIncome={editingItem?.type === 'income' && isIncome(editingItem.data) ? editingItem.data : null}
                    onSuccess={() => {
                      handleSubTabChange('view');
                      fetchAllIncomes();
                      fetchSummaryData();
                      setEditingItem(null);
                    }}
                    onCancel={handleCancelEdit}
                  />
                </div>
              )}
            </>
          )}

          {/* Expenses Tab */}
          {activeTab === 'expenses' && (
            <>
              {/* Sub-tab navigation */}
              <div className="flex gap-4 mb-4">
                <button
                  className={`px-4 py-2 rounded-md transition-colors ${
                    (!activeSubTab || activeSubTab === 'view')
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => handleSubTabChange('')}
                >
                  View Expenses
                </button>
                <button
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeSubTab === 'add'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => handleSubTabChange('add')}
                >
                  {editingItem ? 'Edit Expense' : 'Add Expense'}
                </button>
              </div>

              {(!activeSubTab || activeSubTab === 'view') && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                      All Expenses
                    </h2>
                    <div className="flex gap-2">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value={0}>All Months</option>
                        <option value={1}>January</option>
                        <option value={2}>February</option>
                        <option value={3}>March</option>
                        <option value={4}>April</option>
                        <option value={5}>May</option>
                        <option value={6}>June</option>
                        <option value={7}>July</option>
                        <option value={8}>August</option>
                        <option value={9}>September</option>
                        <option value={10}>October</option>
                        <option value={11}>November</option>
                        <option value={12}>December</option>
                      </select>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value={0}>All Years</option>
                        {availableYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <button
                        onClick={fetchAllExpenses}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                  {loadingExpenses ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <span className="ml-2">Loading expenses...</span>
                    </div>
                  ) : expenses.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">
                        {selectedMonth === 0 && selectedYear === 0 
                          ? 'No expenses recorded' 
                          : `No expenses found for ${selectedMonth === 0 ? 'all months' : new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' })} ${selectedYear === 0 ? 'all years' : selectedYear}`
                        }
                      </p>
                      <button
                        onClick={() => handleSubTabChange('add')}
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                      >
                        Add Your First Expense
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
                      <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {expenses.map((exp, index) => (
                            <tr key={exp.expenseid ?? `expense-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                {exp.expensetitle}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                {formatDate(exp.paiddate)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600 dark:text-red-400">
                                ${formatAmount(exp.amount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                {exp.category || 'Uncategorized'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditItem('expense', exp)}
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem('expense', exp.expenseid!)}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100 dark:bg-gray-700">
                          <tr>
                            <td colSpan={2} className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                              Total
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-red-600 dark:text-red-400">
                              ${formatAmount(expenses.reduce((sum, expense) => sum + (typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount), 0))}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {activeSubTab === 'add' && (
                <div className="max-w-md mx-auto">
                  <AddExpenseForm 
                    editingExpense={editingItem?.type === 'expense' && isExpense(editingItem.data) ? editingItem.data : null}
                    onSuccess={() => {
                      handleSubTabChange('view');
                      fetchAllExpenses();
                      fetchSummaryData();
                      setEditingItem(null);
                    }}
                    onCancel={handleCancelEdit}
                  />
                </div>
              )}
            </>
          )}

          {/* Loans Tab */}
          {activeTab === 'loans' && (
            <>
              {/* Sub-tab navigation */}
              <div className="flex gap-4 mb-4">
                <button
                  className={`px-4 py-2 rounded-md transition-colors ${
                    (!activeSubTab || activeSubTab === 'view')
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => handleSubTabChange('')}
                >
                  View Loans
                </button>
                <button
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeSubTab === 'add'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => handleSubTabChange('add')}
                >
                  {editingItem ? 'Edit Loan' : 'Add Loan'}
                </button>
              </div>

              {(!activeSubTab || activeSubTab === 'view') && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                      All Loans
                    </h2>
                    <div className="flex gap-2">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value={0}>All Months</option>
                        <option value={1}>January</option>
                        <option value={2}>February</option>
                        <option value={3}>March</option>
                        <option value={4}>April</option>
                        <option value={5}>May</option>
                        <option value={6}>June</option>
                        <option value={7}>July</option>
                        <option value={8}>August</option>
                        <option value={9}>September</option>
                        <option value={10}>October</option>
                        <option value={11}>November</option>
                        <option value={12}>December</option>
                      </select>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value={0}>All Years</option>
                        {availableYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <button
                        onClick={fetchAllLoans}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                  {loadingLoans ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <span className="ml-2">Loading loans...</span>
                    </div>
                  ) : loans.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">
                        {selectedMonth === 0 && selectedYear === 0 
                          ? 'No loans recorded' 
                          : `No loans found for ${selectedMonth === 0 ? 'all months' : new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' })} ${selectedYear === 0 ? 'all years' : selectedYear}`
                        }
                      </p>
                      <button
                        onClick={() => handleSubTabChange('add')}
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                      >
                        Add Your First Loan
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
                      <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Total Amount</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Paid</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Remaining</th>
                                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {loans.map((loan, index) => (
                            <tr key={loan.loanid ?? `loan-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                {loan.loantitle}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                ${formatAmount(loan.totalamount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                                ${formatAmount(loan.amountpaid || 0)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400">
                                ${formatAmount(loan.amountleft || loan.totalamount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditItem('loan', loan)}
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem('loan', loan.loanid!)}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100 dark:bg-gray-700">
                          <tr>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                              Total
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                              ${formatAmount(loans.reduce((sum, loan) => sum + (typeof loan.totalamount === 'string' ? parseFloat(loan.totalamount) : loan.totalamount), 0))}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-green-600 dark:text-green-400">
                              ${formatAmount(loans.reduce((sum, loan) => sum + (typeof loan.amountpaid === 'string' ? parseFloat(loan.amountpaid) : (loan.amountpaid || 0)), 0))}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
                              ${formatAmount(loans.reduce((sum, loan) => {
                                const total = typeof loan.totalamount === 'string' ? parseFloat(loan.totalamount) : loan.totalamount;
                                const paid = typeof loan.amountpaid === 'string' ? parseFloat(loan.amountpaid) : (loan.amountpaid || 0);
                                return sum + (total - paid);
                              }, 0))}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {activeSubTab === 'add' && (
                <div className="max-w-md mx-auto">
                  <AddLoanForm 
                    editingLoan={editingItem?.type === 'loan' && isLoan(editingItem.data) ? editingItem.data : null}
                    onSuccess={() => {
                      handleSubTabChange('view');
                      fetchAllLoans();
                      fetchSummaryData();
                      setEditingItem(null);
                    }}
                    onCancel={handleCancelEdit}
                  />
                </div>
              )}
            </>
          )}

          {/* Installments Tab */}
          {activeTab === 'installments' && (
            <>
              {/* Sub-tab navigation */}
              <div className="flex gap-4 mb-4">
                <button
                  className={`px-4 py-2 rounded-md transition-colors ${
                    (!activeSubTab || activeSubTab === 'view')
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => handleSubTabChange('')}
                >
                  View Installments
                </button>
                <button
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeSubTab === 'add'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => handleSubTabChange('add')}
                >
                  {editingItem ? 'Edit Installment' : 'Add Installment'}
                </button>
              </div>

              {/* // Replace the installments table section in your dashboard with this enhanced version: */}
{(!activeSubTab || activeSubTab === 'view') && (
  <div>
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
      <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400">
        All Installment Plans
      </h2>
      <div className="flex gap-2">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value={0}>All Months</option>
          <option value={1}>January</option>
          <option value={2}>February</option>
          <option value={3}>March</option>
          <option value={4}>April</option>
          <option value={5}>May</option>
          <option value={6}>June</option>
          <option value={7}>July</option>
          <option value={8}>August</option>
          <option value={9}>September</option>
          <option value={10}>October</option>
          <option value={11}>November</option>
          <option value={12}>December</option>
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value={0}>All Years</option>
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <button
          onClick={fetchAllInstallments}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
    {loadingInstallments ? (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading installments...</span>
      </div>
    ) : installments.length === 0 ? (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">
          {selectedMonth === 0 && selectedYear === 0 
            ? 'No installment plans recorded' 
            : `No installments found for ${selectedMonth === 0 ? 'all months' : new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' })} ${selectedYear === 0 ? 'all years' : selectedYear}`
          }
        </p>
        <button
          onClick={() => handleSubTabChange('add')}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Add Your First Installment
        </button>
      </div>
    ) : (
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <table className="w-full">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Frequency</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Paid</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Remaining</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Progress</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {installments.map((inst, index) => {
              const progress = ((typeof inst.total_paid === 'string' ? parseFloat(inst.total_paid) : (inst.total_paid || 0)) / (typeof inst.totalamount === 'string' ? parseFloat(inst.totalamount) : inst.totalamount)) * 100;
              
              // Format payment frequency for display
              const formatFrequency = (frequency?: string, intervalDays?: number | string) => {
                switch (frequency) {
                  case 'weekly': return 'Weekly';
                  case 'bi-weekly': return 'Bi-Weekly';
                  case 'monthly': return 'Monthly';
                  case 'quarterly': return 'Quarterly';
                  case 'yearly': return 'Yearly';
                  case 'custom': return intervalDays ? `Every ${intervalDays}d` : 'Custom';
                  default: return 'Monthly';
                }
              };

              // Get status badge color
              const getStatusColor = (status?: string) => {
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

              return (
                <tr key={inst.installmentid ?? `installment-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <div>
                      <div className="font-medium">{inst.installmenttitle}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {inst.payments_made || 0}/{inst.installmentdurationinmonths} payments
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="text-gray-900 dark:text-gray-100">
                      {formatFrequency(inst.payment_frequency, inst.payment_interval_days)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatAmount(inst.amountpermonth || 0)}/period
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inst.status)}`}>
                      {inst.status ? inst.status.charAt(0).toUpperCase() + inst.status.slice(1) : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {formatAmount(inst.totalamount)}
                    {inst.advancepaid && (
                      <div className="text-xs text-yellow-600 dark:text-yellow-400">
                        Advance: {formatAmount(inst.advanceamount || 0)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                    {formatAmount(inst.total_paid || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400">
                    {formatAmount(inst.remaining_amount || inst.totalamount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
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
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {progress.toFixed(1)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditItem('installment', inst)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem('installment', inst.installmentid!)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <td colSpan={3} className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Total ({installments.length} plans)
              </td>
              <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {formatAmount(installments.reduce((sum, inst) => sum + (typeof inst.totalamount === 'string' ? parseFloat(inst.totalamount) : inst.totalamount), 0))}
              </td>
              <td className="px-6 py-4 text-sm font-semibold text-green-600 dark:text-green-400">
                {formatAmount(installments.reduce((sum, inst) => sum + (typeof inst.total_paid === 'string' ? parseFloat(inst.total_paid) : (inst.total_paid || 0)), 0))}
              </td>
              <td className="px-6 py-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
                {formatAmount(installments.reduce((sum, inst) => {
                  const total = typeof inst.totalamount === 'string' ? parseFloat(inst.totalamount) : inst.totalamount;
                  const paid = typeof inst.total_paid === 'string' ? parseFloat(inst.total_paid) : (inst.total_paid || 0);
                  return sum + (total - paid);
                }, 0))}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    )}
  </div>
)}
              {activeSubTab === 'add' && (
                <div className="max-w-md mx-auto">
                  <AddInstallmentForm 
                    editingInstallment={editingItem?.type === 'installment' && isInstallment(editingItem.data) ? editingItem.data : null}
                    onSuccess={() => {
                      handleSubTabChange('view');
                      fetchAllInstallments();
                      fetchSummaryData();
                      fetchUpcomingPayments();
                      setEditingItem(null);
                    }}
                    onCancel={handleCancelEdit}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;