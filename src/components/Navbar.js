'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import LogoutModal from '@/components/LogoutModal';

export default function Navbar() {
  const { user, isLoading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const linkClass =
    'text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded';

  return (
    <>
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-zinc-200">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-10">
            <Link
              href="/"
              className="font-serif text-2xl font-bold tracking-tight text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded"
            >
              MyBlog
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/posts" className={linkClass}>
                All posts
              </Link>
              {user && (
                <Link href="/me" className={linkClass}>
                  My posts
                </Link>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {isLoading ? (
              <div className="h-8 w-28 rounded bg-zinc-100 animate-pulse" />
            ) : user ? (
              <>
                <Link
                  href="/create"
                  className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-700"
                >
                  Write a post
                </Link>
                <div className="flex items-center gap-2 pl-2 border-l border-zinc-200">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white"
                    aria-hidden="true"
                  >
                    {user.username?.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-zinc-800">{user.username}</span>
                </div>
                <button
                  onClick={() => {
                    setOpen(false);
                    setLogoutOpen(true);
                  }}
                  className={linkClass}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={linkClass}>
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900"
                >
                  Create account
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 -mr-2 text-zinc-700 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t border-zinc-200 py-4 flex flex-col gap-4">
            <Link href="/posts" className={linkClass} onClick={() => setOpen(false)}>
              All posts
            </Link>
            {isLoading ? (
              <div className="h-8 w-28 rounded bg-zinc-100 animate-pulse" />
            ) : user ? (
              <>
                <Link href="/me" className={linkClass} onClick={() => setOpen(false)}>
                  My posts
                </Link>
                <Link href="/create" className={linkClass} onClick={() => setOpen(false)}>
                  Write a post
                </Link>
                <div className="flex items-center justify-between pt-3 border-t border-zinc-200">
                  <span className="text-sm text-zinc-600">
                    Signed in as <span className="font-semibold text-zinc-900">{user.username}</span>
                  </span>
                  <button
                  onClick={() => {
                    setOpen(false);
                    setLogoutOpen(true);
                  }}
                  className={linkClass}
                >
                    Log out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className={linkClass} onClick={() => setOpen(false)}>
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-center text-sm font-semibold text-white"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>

    <LogoutModal
      isOpen={logoutOpen}
      onClose={() => setLogoutOpen(false)}
      onConfirm={() => {
        setLogoutOpen(false);
        logout();
      }}
      username={user?.username}
    />
    </>
  );
}