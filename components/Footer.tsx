import React from "react";

const Footer = () => {
  console.log("Footer rendered"); // Debug line

  return (
    <footer className="footer footer-center p-4 bg-gray-800 text-gray-200 mt-auto">
      <aside>
        <p className="text-sm">
          Copyright © {new Date().getFullYear()} Nimil Zubair - All rights reserved |{" "}
          <a
            href="https://www.linkedin.com/in/nimil-zubair"
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
