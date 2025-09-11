import React from "react";
import Link from "next/link";

const Navbar = () => {
  return (
    <div className="navbar bg-gray-900 text-white shadow-lg fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4">
      {/* Left section */}
      <div className="navbar-start flex items-center">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-gray-800 rounded-box z-[1] mt-3 w-52 p-2 shadow-lg"
          >
            <li>
              <Link
                href="/dashboard"
                className="text-white hover:bg-gray-700 rounded"
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/expenses"
                className="text-white hover:bg-gray-700 rounded"
              >
                All Expenses
              </Link>
            </li>
            <li>
              <Link
                href="/reports"
                className="text-white hover:bg-gray-700 rounded"
              >
                Reports
              </Link>
            </li>
            <li>
              <Link
                href="/installments"
                className="text-white hover:bg-gray-700 rounded"
              >
                Installments
              </Link>
            </li>
            <li>
              <a href="#" className="text-white hover:bg-gray-700 rounded">
                Settings
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Center section */}
      <div className="navbar-center">
        <Link
          href="/dashboard"
          className="btn btn-ghost text-xl font-semibold normal-case"
        >
          Finance Tracker
        </Link>
      </div>

      {/* Right section */}
      <div className="navbar-end flex items-center gap-2">
        {/* Notifications */}
        <button className="btn btn-ghost btn-circle">
          <div className="indicator">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span className="badge badge-xs badge-primary indicator-item"></span>
          </div>
        </button>

        {/* Profile dropdown */}
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost btn-circle avatar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-gray-800 rounded-box z-[1] mt-3 w-52 p-2 shadow-lg"
          >
            <li>
              <a href="#" className="text-white hover:bg-gray-700 rounded">
                Profile
              </a>
            </li>
            <li>
              <Link
                href="/login"
                className="text-white hover:bg-gray-700 rounded"
              >
                Logout
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
