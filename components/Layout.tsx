import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16 pb-16"> {/* Adjust padding based on navbar/footer height */}
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;