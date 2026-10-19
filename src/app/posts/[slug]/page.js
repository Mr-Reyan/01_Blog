'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import PublishModal from '@/components/PublishModal';
import DeleteModal from '@/components/DeleteModal';
import CommentSection from '@/components/CommentSection';

const readingTime = (body = '') => Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', params.slug],
    queryFn: async () => {
      const response = await api.get(`/posts/${params.slug}/`);
      return response.data;
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/posts/${params.slug}/publish/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['post', params.slug]);
      queryClient.invalidateQueries({ queryKey: ['myPosts'] });
      queryClient.invalidateQueries(['posts']);
      queryClient.invalidateQueries(['allPosts']);
      toast.success('Post published successfully!');
      setPublishModalOpen(false);
    },
    onError: (error) => {
      if (error.response?.status === 409) {
        toast.error('Post is already published');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to publish this post');
      } else if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Failed to publish post');
      }
      setPublishModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/posts/${params.slug}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPosts'] });
      queryClient.invalidateQueries(['posts']);
      queryClient.invalidateQueries(['allPosts']);
      toast.success('Post deleted successfully!');
      router.push('/me');
    },
    onError: (error) => {
      if (error.response?.status === 403) {
        toast.error('You do not have permission to delete this post');
      } else if (error.response?.status === 404) {
        toast.error('Post not found');
      } else if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Failed to delete post');
      }
      setDeleteModalOpen(false);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 animate-pulse" aria-busy="true">
          <div className="h-4 w-24 rounded bg-zinc-100 mb-6" />
          <div className="h-12 w-4/5 rounded bg-zinc-100 mb-4" />
          <div className="h-5 w-1/2 rounded bg-zinc-100 mb-10" />
          <div className="space-y-3">
            <div className="h-4 rounded bg-zinc-100" />
            <div className="h-4 rounded bg-zinc-100" />
            <div className="h-4 w-5/6 rounded bg-zinc-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const is404 = error.response?.status === 404;
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
            {is404 ? 'Post not found' : 'We couldn’t load this post'}
          </h1>
          <p className="mt-4 text-lg text-zinc-600">
            {is404
              ? 'This post doesn’t exist, or you don’t have permission to view it.'
              : 'Something went wrong. Refresh the page or try again later.'}
          </p>
          <Link
            href="/"
            className="mt-8 inline-block rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900"
          >
            Go to home
          </Link>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  const isAuthor = user && post.author && user.username === post.author.username;
  const isAdmin = user && user.role == "ADMIN"
  const isDraft = post.status === 'DRAFT';
  const canPublish = (isAuthor || isAdmin) && isDraft;

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {(isAuthor || isAdmin) && (
          <div className="mb-8 flex flex-wrap items-center justify-end gap-3 border-b border-zinc-200 pb-4">
            {canPublish && (
              <button
                onClick={() => setPublishModalOpen(true)}
                disabled={publishMutation.isPending}
                className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Publish post
              </button>
            )}
            <button
              onClick={() => router.push(`/edit/${params.slug}`)}
              className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-semibold text-zinc-800 hover:border-zinc-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900"
            >
              Edit
            </button>
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="rounded-full px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-600"
            >
              Delete
            </button>
          </div>
        )}

        {isDraft && (
          <div role="status" className="mb-8 border-l-4 border-amber-500 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">This is a draft</p>
            <p className="text-sm text-amber-800">It isn’t published yet. Only you can see it.</p>
          </div>
        )}

        <article>
          <header className="mb-10">
            {post.categories && post.categories.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {post.categories.map((category) => (
                  <span
                    key={category.id}
                    className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            )}

            <h1 className="font-serif text-4xl sm:text-5xl font-bold leading-[1.15] tracking-tight">
              {post.title}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-500">
              {post.author && (
                <span className="flex items-center gap-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white"
                    aria-hidden="true"
                  >
                    {post.author.username.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium text-zinc-800">{post.author.username}</span>
                </span>
              )}
              {post.published_at && (
                <span>
                  {new Date(post.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              )}
              <span>{readingTime(post.body)} min read</span>
            </div>
          </header>

          <div className="font-serif text-lg sm:text-xl leading-8 sm:leading-9 text-zinc-800">
            {post.body.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-6">
                {paragraph}
              </p>
            ))}
          </div>
        </article>

        <div className="mt-12 border-t border-zinc-200 pt-6">
          <Link
            href={isAuthor ? '/me' : '/'}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            {isAuthor ? 'Back to my posts' : 'Back to home'}
          </Link>
        </div>

        <CommentSection slug={params.slug} isDraft={isDraft} postAuthorId={post.author?.id} />
      </div>

      <PublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        onConfirm={() => publishMutation.mutate()}
        postTitle={post.title}
      />

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        postTitle={post.title}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}