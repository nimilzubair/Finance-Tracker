import React from 'react';

const Footer = () => {
  return (
    <footer className="footer footer-center p-4 bg-gray-800 text-gray-200 fixed bottom-0 left-0 right-0 z-40">
      <aside>
        <p className="text-sm">
          Copyright © {new Date().getFullYear()} Finance Tracker - All rights reserved
        </p>
      </aside>
    </footer>
  );
};

export default Footer;