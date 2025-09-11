import React from "react";

const Footer = () => {
  return (
    <footer className="footer footer-center p-4 bg-gray-800 text-gray-200 fixed bottom-0 left-0 right-0 z-40">
      <aside>
        <p className="text-sm">
          Copyright © {new Date().getFullYear()} Nimil Zubair - All rights reserved |{" "}
          <a
            href="https://www.linkedin.com/in/nimil-zubair-b4bb39296"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            LinkedIn
          </a>
        </p>
      </aside>
    </footer>
  );
};

export default Footer;
