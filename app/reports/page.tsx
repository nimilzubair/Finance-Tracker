// app/reports/page.tsx
'use client';
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';

interface Expense {
  expensetitle: string;
  amount: number | string;
  paiddate: string;
}

interface ReportData {
  totalExpenses: number;
  averageExpense: number;
  largestExpense: number;
  expenseCount: number;
  expensesByMonth: { month: string; total: number }[];
}

const ReportsPage = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses/all');
      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
        generateReportData(data);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReportData = (expensesData: Expense[]) => {
    if (expensesData.length === 0) {
      setReportData(null);
      return;
    }

    // Convert amounts to numbers safely
    const numericExpenses = expensesData
      .map(expense => ({
        ...expense,
        amount:
          typeof expense.amount === 'string'
            ? parseFloat(expense.amount)
            : expense.amount,
      }))
      .filter(expense => !isNaN(expense.amount));

    const totalExpenses = numericExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const averageExpense = totalExpenses / numericExpenses.length;
    const largestExpense = Math.max(
      ...numericExpenses.map(expense => expense.amount)
    );

    // Group by month
    const expensesByMonth = numericExpenses.reduce((acc, expense) => {
      const month = new Date(expense.paiddate).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
      acc[month] = (acc[month] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    setReportData({
      totalExpenses,
      averageExpense,
      largestExpense,
      expenseCount: numericExpenses.length,
      expensesByMonth: Object.entries(expensesByMonth).map(([month, total]) => ({
        month,
        total,
      })),
    });
  };

  const formatAmount = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-4">
        <h1 className="text-3xl font-extrabold mb-6 text-blue-700">
            Financial Reports
        </h1>
          <p className="text-gray-700">Loading reports...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-extrabold mb-6 text-blue-700">
            Financial Reports
        </h1>

        {!reportData ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <p className="text-gray-700 text-lg mb-4">
              No expense data available for reports
            </p>
            <a
              href="/dashboard?tab=add-expense"
              className="text-blue-700 hover:text-blue-900 font-medium"
            >
              Add your first expense
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Summary Cards */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">
                Expense Summary
              </h2>
              <div className="space-y-3 text-gray-800">
                <div className="flex justify-between">
                  <span>Total Expenses:</span>
                  <span className="font-bold text-blue-700">
                    {formatAmount(reportData.totalExpenses)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Number of Expenses:</span>
                  <span className="font-bold text-gray-900">
                    {reportData.expenseCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Average Expense:</span>
                  <span className="font-bold text-blue-700">
                    {formatAmount(reportData.averageExpense)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Largest Expense:</span>
                  <span className="font-bold text-blue-700">
                    {formatAmount(reportData.largestExpense)}
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Breakdown */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">
                Monthly Breakdown
              </h2>
              {reportData.expensesByMonth.length === 0 ? (
                <p className="text-gray-700">No monthly data available</p>
              ) : (
                <div className="space-y-2 text-gray-800">
                  {reportData.expensesByMonth.map(({ month, total }) => (
                    <div key={month} className="flex justify-between">
                      <span>{month}:</span>
                      <span className="font-bold text-blue-700">
                        {formatAmount(total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ReportsPage;
