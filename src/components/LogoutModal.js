'use client';

import { useEffect } from 'react';

export default function LogoutModal({ isOpen, onClose, onConfirm, username }) {
  // Close with the Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        aria-describedby="logout-desc"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="logout-title" className="font-serif text-2xl font-bold tracking-tight text-zinc-900">
          Log out?
        </h2>

        <p id="logout-desc" className="mt-3 leading-relaxed text-zinc-600">
          {username ? (
            <>
              You’re signed in as <strong className="font-semibold text-zinc-900">{username}</strong>. You’ll
              need to log in again to write posts or comment.
            </>
          ) : (
            'You’ll need to log in again to write posts or comment.'
          )}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            autoFocus
            className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-800 transition-colors hover:border-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900"
          >
            Stay logged in
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}