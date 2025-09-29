// components/InstallmentsList.tsx - ENHANCED with frequency filtering
'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import InstallmentItem from './InstallmentItem';
import AddInstallmentForm from './AddInstallmentForm';
import { FiPlus, FiSearch, FiFilter, FiX } from 'react-icons/fi';

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

const InstallmentsList: React.FC = () => {
  const { user, token } = useAuth();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<Installment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('startdate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const statusOptions = ['all', 'active', 'completed', 'overdue'];
  const frequencyOptions = [
    { value: 'all', label: 'All Frequencies' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi-weekly', label: 'Bi-Weekly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'custom', label: 'Custom' },
  ];

  const sortOptions = [
    { value: 'startdate', label: 'Start Date' },
    { value: 'installmenttitle', label: 'Title' },
    { value: 'totalamount', label: 'Total Amount' },
    { value: 'remaining_amount', label: 'Remaining Amount' },
    { value: 'status', label: 'Status' },
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchInstallments();
  }, [user, token]);

  const fetchInstallments = async () => {
    if (!user || !token) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/installments', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInstallments(data.installments || []);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to fetch installments');
      }
    } catch (error: any) {
      setError(error.message || 'Error fetching installment plans');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (installment: Installment) => {
    setEditingInstallment(installment);
    setShowAddForm(true);
  };

  const handleDelete = (installmentId: number) => {
    setInstallments((prev) => prev.filter((inst) => inst.installmentid !== installmentId));
  };

  const handleFormSuccess = () => {
    setShowAddForm(false);
    setEditingInstallment(null);
    fetchInstallments();
  };

  const handleFormCancel = () => {
    setShowAddForm(false);
    setEditingInstallment(null);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedInstallments = installments
    .filter((installment) => {
      const matchesSearch =
        installment.installmenttitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (installment.description && installment.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || installment.status.toLowerCase() === statusFilter;

      const matchesFrequency =
        frequencyFilter === 'all' ||
        installment.payment_frequency === frequencyFilter ||
        (frequencyFilter === 'custom' && installment.payment_frequency === 'custom');

      return matchesSearch && matchesStatus && matchesFrequency;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'startdate':
          aValue = new Date(a.startdate);
          bValue = new Date(b.startdate);
          break;
        case 'installmenttitle':
          aValue = a.installmenttitle.toLowerCase();
          bValue = b.installmenttitle.toLowerCase();
          break;
        case 'totalamount':
          aValue = a.totalamount;
          bValue = b.totalamount;
          break;
        case 'remaining_amount':
          aValue = a.remaining_amount;
          bValue = b.remaining_amount;
          break;
        case 'status':
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const getTotalStats = () => {
    const totalAmount = installments.reduce((sum, inst) => sum + inst.totalamount, 0);
    const totalPaid = installments.reduce((sum, inst) => sum + inst.total_paid, 0);
    const totalRemaining = installments.reduce((sum, inst) => sum + inst.remaining_amount, 0);
    const activePlans = installments.filter((inst) => inst.status === 'active').length;

    return { totalAmount, totalPaid, totalRemaining, activePlans };
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error && !installments.length) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
        <p>Error: {error}</p>
        <button
          onClick={fetchInstallments}
          className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Installment Plans</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your payment schedules</p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-purple-500 dark:bg-purple-600 text-white px-4 py-2 rounded-md 
                     hover:bg-purple-600 dark:hover:bg-purple-700 transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          Add New Plan
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Plans</h3>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{installments.length}</p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Active Plans</h3>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.activePlans}</p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200">Total Paid</h3>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">${stats.totalPaid.toFixed(2)}</p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Total Remaining</h3>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100">${stats.totalRemaining.toFixed(2)}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search plans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            {statusOptions.filter((opt) => opt !== 'all').map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>

          {/* Frequency Filter */}
          <select
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            {frequencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order as 'asc' | 'desc');
            }}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            {sortOptions.map((option) => (
              <React.Fragment key={option.value}>
                <option value={`${option.value}-asc`}>{option.label} (A-Z)</option>
                <option value={`${option.value}-desc`}>{option.label} (Z-A)</option>
              </React.Fragment>
            ))}
          </select>
        </div>

        {/* Active Filters Display */}
        {(searchTerm || statusFilter !== 'all' || frequencyFilter !== 'all') && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>

            {searchTerm && (
              <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-sm">
                Search: {`"${searchTerm}"`}
                <button onClick={() => setSearchTerm('')} className="hover:text-blue-600">
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            )}

            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-sm">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter('all')} className="hover:text-green-600">
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            )}

            {frequencyFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full text-sm">
                Frequency: {frequencyOptions.find((f) => f.value === frequencyFilter)?.label}
                <button onClick={() => setFrequencyFilter('all')} className="hover:text-purple-600">
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <AddInstallmentForm
          editingInstallment={editingInstallment}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      {/* Installments Grid */}
      {filteredAndSortedInstallments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedInstallments.map((installment) => (
            <InstallmentItem
              key={installment.installmentid}
              installment={installment}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRefresh={fetchInstallments}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <FiFilter className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No installment plans found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {installments.length === 0
              ? 'You haven&apos;t created any installment plans yet.'
              : 'No plans match your current filters.'}
          </p>
          {installments.length === 0 && (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-purple-500 dark:bg-purple-600 text-white px-6 py-2 rounded-md 
                         hover:bg-purple-600 dark:hover:bg-purple-700 transition-colors"
            >
              Create Your First Plan
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default InstallmentsList;
