'use client';

import { useEffect } from 'react';

// isPublishing is optional: pass publishMutation.isPending to disable the buttons while publishing.
export default function PublishModal({ isOpen, onClose, onConfirm, postTitle, isPublishing = false }) {
  // Close with the Escape key (unless a publish is in progress)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !isPublishing) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isPublishing, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-title"
        aria-describedby="publish-desc"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="publish-title" className="font-serif text-2xl font-bold tracking-tight text-zinc-900">
          Publish this post?
        </h2>

        <p id="publish-desc" className="mt-3 leading-relaxed text-zinc-600">
          “<strong className="font-semibold text-zinc-900">{postTitle}</strong>” will be visible to everyone
          as soon as you publish it.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isPublishing}
            className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-800 transition-colors hover:border-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPublishing}
            className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPublishing ? 'Publishing…' : 'Publish post'}
          </button>
        </div>
      </div>
    </div>
  );
}