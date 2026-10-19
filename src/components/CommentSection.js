'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const MAX_LENGTH = 500; // keep in sync with the max_length on your Comment model/serializer

// Serializer returns: author (user id) and author_username
const authorName = (comment) => comment.author_username || 'Unknown';

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '';

export default function CommentSection({ slug, isDraft = false, postAuthorId = null }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);

  const commentsKey = ['comments', slug];

  // Check if current user is the post author or ADMIN
  const isPostAuthor = !!user && !!postAuthorId && user.id === postAuthorId;
  const isAdmin = !!user && user.role === 'ADMIN';
  const canCommentOnDraft = isDraft && (isPostAuthor || isAdmin);
  const canInteract = !isDraft || canCommentOnDraft;

  // GET /posts/{slug}/comments/ (public)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: commentsKey,
    queryFn: async () => {
      const response = await api.get(`/posts/${slug}/comments/`);
      return response.data;
    },
  });
  const comments = Array.isArray(data) ? data : data?.results ?? [];

  // POST /posts/{slug}/comments/ (logged-in users only)
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post(`/posts/${slug}/comments/`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey });
      setBody('');
      setFieldError('');
      toast.success('Comment posted');
    },
    onError: (err) => {
      const status = err.response?.status;
      if (status === 400) {
        const msg = err.response.data?.body;
        setFieldError(Array.isArray(msg) ? msg[0] : msg || 'Please check your comment and try again.');
      } else if (status === 401) {
        toast.error('Log in to post a comment');
      } else if (status === 403) {
        toast.error('You do not have permission to comment');
      } else if (status === 404) {
        toast.error('This post no longer exists');
      } else if (status === 409) {
        toast.error(err.response.data?.detail || 'Comments are disabled on this post');
      } else if (status === 429) {
        toast.error(err.response.data?.detail || 'Too many requests. Try again shortly.');
      } else if (err.request) {
        toast.error('Network error. Please try again.');
      } else {
        toast.error('Failed to post comment');
      }
    },
  });

  // DELETE /posts/{slug}/comments/{id}/ (comment owner or admin)
  const deleteMutation = useMutation({
    mutationFn: async (commentId) => {
      await api.delete(`/posts/${slug}/comments/${commentId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey });
      toast.success('Comment deleted');
    },
    onError: (err) => {
      const status = err.response?.status;
      if (status === 403) {
        toast.error('You do not have permission to delete this comment');
      } else if (status === 404) {
        toast.error('Comment not found');
        queryClient.invalidateQueries({ queryKey: commentsKey });
      } else {
        toast.error(err.response?.data?.detail || 'Failed to delete comment');
      }
    },
    onSettled: () => setConfirmingId(null),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) {
      setFieldError('Write something before posting.');
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setFieldError(`Comments can be up to ${MAX_LENGTH} characters.`);
      return;
    }
    setFieldError('');
    createMutation.mutate({ body: trimmed });
  };

  const isOwner = (comment) =>
    !!user && (comment.author === user.id || comment.author_username === user.username);

  const canDelete = (comment) => !!user && (user.role === 'ADMIN' || isOwner(comment));

  return (
    <section aria-labelledby="comments-heading" className="mt-10 border-t border-zinc-200 pt-10">
      <h2 id="comments-heading" className="font-serif text-2xl font-bold tracking-tight">
        Comments{!isLoading && !error ? ` (${comments.length})` : ''}
      </h2>

      {/* Form: logged-in users on published posts; visitors get a prompt */}
      <div className="mt-6">
        {isDraft && !canCommentOnDraft ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-900">Draft Post - Limited Access</p>
                <p className="text-sm text-amber-800 mt-1">
                  Only the post author and admins can comment on draft posts. Comments will be visible to all once published.
                </p>
              </div>
            </div>
          </div>
        ) : user ? (
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="comment-body" className="mb-2 block text-sm font-semibold text-zinc-800">
              Add a comment
              {isDraft && canCommentOnDraft && (
                <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                  Draft preview
                </span>
              )}
            </label>
            <textarea
              id="comment-body"
              rows={4}
              maxLength={MAX_LENGTH}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your thoughts"
              aria-invalid={!!fieldError}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
            <div className="mt-1 flex justify-between">
              {fieldError ? (
                <p role="alert" className="text-sm text-red-700">
                  {fieldError}
                </p>
              ) : (
                <span />
              )}
              <span className="text-xs text-zinc-500">
                {body.length}/{MAX_LENGTH}
              </span>
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="mt-3 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending ? 'Posting…' : 'Post comment'}
            </button>
          </form>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4">
            <p className="text-zinc-700">Log in or create an account to join the conversation.</p>
            <div className="mt-3 flex gap-3">
              <Link
                href="/login"
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:border-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900"
              >
                Create account
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="mt-8">
        {isLoading && (
          <div className="space-y-6 animate-pulse" aria-busy="true">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-32 rounded bg-zinc-100" />
                <div className="h-4 rounded bg-zinc-100" />
                <div className="h-4 w-2/3 rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="font-semibold text-red-800">We couldn’t load the comments.</p>
            <button
              onClick={() => refetch()}
              className="mt-1 rounded text-sm font-semibold text-red-800 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && comments.length === 0 && (
          <p className="text-zinc-600">
            {user && canInteract ? 'No comments yet. Be the first to comment.' : 'No comments yet.'}
          </p>
        )}

        {!isLoading && !error && comments.length > 0 && (
          <ul className="divide-y divide-zinc-200">
            {comments.map((comment) => (
              <li key={comment.id} className="py-6 first:pt-0">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white"
                    aria-hidden="true"
                  >
                    {authorName(comment).charAt(0).toUpperCase()}
                  </span>
                  <div className="text-sm">
                    <span className="font-semibold text-zinc-900">{authorName(comment)}</span>
                    <span className="ml-3 text-zinc-500">{formatDate(comment.created_at)}</span>
                  </div>

                  {canDelete(comment) && (
                    <div className="ml-auto text-sm">
                      {confirmingId === comment.id ? (
                        <span className="flex items-center gap-3">
                          <span className="text-zinc-600">Delete this comment?</span>
                          <button
                            onClick={() => deleteMutation.mutate(comment.id)}
                            disabled={deleteMutation.isPending}
                            className="rounded font-semibold text-red-700 hover:text-red-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700 disabled:opacity-50"
                          >
                            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            disabled={deleteMutation.isPending}
                            className="rounded font-semibold text-zinc-600 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmingId(comment.id)}
                          className="rounded font-semibold text-zinc-500 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-zinc-800">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}