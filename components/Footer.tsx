import React from "react";

const Footer = () => {
  return (
    <footer className="p-4 bg-gray-800 text-gray-200 mt-auto">
      <div className="flex justify-center">
        <p className="text-sm text-center">
          Copyright © {new Date().getFullYear()} Nimil Zubair - All rights
          reserved |{" "}
          <a
            href="https://www.linkedin.com/in/nimil-zubair"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            LinkedIn
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
