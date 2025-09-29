'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface CurrencyContextType {
  currency: string;
  exchangeRate: number;
  setCurrency: (currency: string) => void;
  convertAmount: (amount: number) => number;
  formatCurrency: (amount: number) => string;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [currency, setCurrencyState] = useState<string>('PKR');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  // Load saved currency from localStorage first for instant UI
  useEffect(() => {
    const saved = localStorage.getItem('currency');
    if (saved) {
      setCurrencyState(saved);
    }
  }, []);

  // Fetch user's saved currency from backend when token is ready
  useEffect(() => {
    if (token) {
      fetchCurrencySettings();
    }
  }, [token]);

  const fetchCurrencySettings = async () => {
    try {
      const response = await fetch('/api/settings/currency', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.currency) {
          setCurrencyState(data.currency);
          localStorage.setItem('currency', data.currency);
        }
      }
    } catch (error) {
      console.error('Error fetching currency settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch exchange rate whenever currency changes
  useEffect(() => {
    if (currency && currency !== 'PKR' && token) {
      fetchExchangeRate(currency);
    } else {
      setExchangeRate(1);
    }
  }, [currency, token]);

  const fetchExchangeRate = async (toCurrency: string) => {
    try {
      const response = await fetch(`/api/settings/exchange-rate?from=PKR&to=${toCurrency}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setExchangeRate(data.rate || 1);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      setExchangeRate(1);
    }
  };

  const convertAmount = (amount: number): number => amount * exchangeRate;

  const formatCurrency = (amount: number): string => {
    const converted = convertAmount(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  };

  const updateCurrency = async (newCurrency: string) => {
    // Optimistic update
    setCurrencyState(newCurrency);
    localStorage.setItem('currency', newCurrency);

    try {
      const response = await fetch('/api/settings/currency', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currency: newCurrency }),
      });

      if (!response.ok) {
        throw new Error('Failed to update currency');
      }
    } catch (error) {
      console.error('Error updating currency:', error);
      // Roll back to server value if PUT fails
      await fetchCurrencySettings();
    }
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        exchangeRate,
        setCurrency: updateCurrency,
        convertAmount,
        formatCurrency,
        loading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
