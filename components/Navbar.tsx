// components/Navbar.tsx
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const menuRef = useRef<HTMLUListElement | null>(null);
  const profileRef = useRef<HTMLUListElement | null>(null);

  // Close on outside click or Escape
  useEffect(() => {
    function handleDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !(e.target as HTMLElement).closest("#menu-toggle")
      ) {
        setIsMenuOpen(false);
      }
      if (
        isProfileOpen &&
        profileRef.current &&
        !profileRef.current.contains(target) &&
        !(e.target as HTMLElement).closest("#profile-toggle")
      ) {
        setIsProfileOpen(false);
      }
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isMenuOpen, isProfileOpen]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white shadow-lg h-14 flex items-center justify-between px-4">
      {/* LEFT */}
      <div className="relative flex items-center gap-2">
        <button
          id="menu-toggle"
          aria-expanded={isMenuOpen}
          aria-controls="main-menu"
          onClick={() => {
            setIsMenuOpen((s) => !s);
            setIsProfileOpen(false);
          }}
          className="btn btn-ghost btn-circle p-2"
          type="button"
        >
          {/* hamburger */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>

        {/* Controlled menu (rendered only when open) */}
        {isMenuOpen && (
          <ul
            id="main-menu"
            ref={menuRef}
            className="absolute left-4 top-14 mt-2 w-52 bg-gray-800 rounded p-2 shadow-lg text-sm"
            role="menu"
          >
            <li role="none">
              <Link role="menuitem" href="/dashboard" className="block px-3 py-2 rounded hover:bg-gray-700" onClick={() => setIsMenuOpen(false)}>
                Dashboard
              </Link>
            </li>
            <li role="none">
              <Link role="menuitem" href="/expenses" className="block px-3 py-2 rounded hover:bg-gray-700" onClick={() => setIsMenuOpen(false)}>
                All Expenses
              </Link>
            </li>
            <li role="none">
              <Link role="menuitem" href="/reports" className="block px-3 py-2 rounded hover:bg-gray-700" onClick={() => setIsMenuOpen(false)}>
                Reports
              </Link>
            </li>
            <li role="none">
              <Link role="menuitem" href="/installments" className="block px-3 py-2 rounded hover:bg-gray-700" onClick={() => setIsMenuOpen(false)}>
                Installments
              </Link>
            </li>
            <li role="none">
              <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-700" onClick={() => setIsMenuOpen(false)}>
                Settings
              </button>
            </li>
          </ul>
        )}
      </div>

      {/* CENTER */}
      <div className="navbar-center">
        <Link href="/dashboard" className="btn btn-ghost text-lg font-semibold normal-case">
          Finance Tracker
        </Link>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost btn-circle" type="button" aria-label="notifications">
          <div className="indicator">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="badge badge-xs badge-primary indicator-item" />
          </div>
        </button>

        <div className="relative">
          <button
            id="profile-toggle"
            aria-expanded={isProfileOpen}
            aria-controls="profile-menu"
            onClick={() => {
              setIsProfileOpen((s) => !s);
              setIsMenuOpen(false);
            }}
            className="btn btn-ghost btn-circle avatar p-2"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>

          {isProfileOpen && (
            <ul
              id="profile-menu"
              ref={profileRef}
              className="absolute right-4 top-14 mt-2 w-44 bg-gray-800 rounded p-2 shadow-lg text-sm"
              role="menu"
            >
              <li role="none">
                <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-700" onClick={() => setIsProfileOpen(false)}>
                  Profile
                </button>
              </li>
              <li role="none">
                <Link href="/login" className="block px-3 py-2 rounded hover:bg-gray-700" onClick={() => setIsProfileOpen(false)}>
                  Logout
                </Link>
              </li>
            </ul>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
