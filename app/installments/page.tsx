'use client';
import React from 'react';
import Layout from '@/components/Layout';
import InstallmentsOverview from '@/components/InstallmentsOverview';

const InstallmentsPage = () => {
  return (
    <Layout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Installment Plans</h1>
        <InstallmentsOverview />
      </div>
    </Layout>
  );
};

export default InstallmentsPage;