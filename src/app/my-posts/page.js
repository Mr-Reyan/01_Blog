'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import PublishModal from '@/components/PublishModal';
import DeleteModal from '@/components/DeleteModal';

export default function MyPostsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDraftsOnly, setShowDraftsOnly] = useState(false);
  const [publishModalPost, setPublishModalPost] = useState(null);
  const [deleteModalPost, setDeleteModalPost] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['myPosts'],
    queryFn: async () => {
      const response = await api.get('/posts/?mine=true');
      return response.data;
    },
    enabled: !!user,
  });

  const publishMutation = useMutation({
    mutationFn: async (slug) => {
      const response = await api.post(`/posts/${slug}/publish/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myPosts']);
      queryClient.invalidateQueries(['posts']);
      toast.success('Post published successfully!');
      setPublishModalPost(null);
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
      setPublishModalPost(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (slug) => {
      await api.delete(`/posts/${slug}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myPosts']);
      queryClient.invalidateQueries(['posts']);
      toast.success('Post deleted successfully!');
      setDeleteModalPost(null);
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
      setDeleteModalPost(null);
    },
  });

  const handlePublishClick = (post) => {
    setPublishModalPost(post);
  };

  const handlePublishConfirm = () => {
    if (publishModalPost) {
      publishMutation.mutate(publishModalPost.slug);
    }
  };

  const handleDeleteClick = (post) => {
    setDeleteModalPost(post);
  };

  const handleDeleteConfirm = () => {
    if (deleteModalPost) {
      deleteMutation.mutate(deleteModalPost.slug);
    }
  };

  const handleEditClick = (slug) => {
    router.push(`/edit/${slug}`);
  };

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const filteredPosts = showDraftsOnly
    ? posts?.filter((post) => post.status === 'DRAFT')
    : posts;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Posts</h1>
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={showDraftsOnly}
            onChange={(e) => setShowDraftsOnly(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-700 group-hover:text-gray-900 transition-colors">
            Show drafts only
          </span>
        </label>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3 animate-fade-in">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-600 font-medium">Failed to load your posts. Please try again.</p>
        </div>
      )}

      {!isLoading && !error && (!posts || posts.length === 0) && (
        <div className="text-center py-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl animate-fade-in">
          <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <p className="text-xl text-gray-700 font-semibold mb-2">
            You haven't created any posts yet.
          </p>
          <p className="text-gray-500 mb-6">Start sharing your stories with the world!</p>
          <Link
            href="/create"
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Create your first post
          </Link>
        </div>
      )}

      {!isLoading && !error && filteredPosts && filteredPosts.length === 0 && posts && posts.length > 0 && (
        <div className="text-center py-16 bg-green-50 rounded-2xl animate-fade-in">
          <svg className="w-16 h-16 text-green-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xl text-gray-700 font-semibold">
            No draft posts found. All your posts are published!
          </p>
        </div>
      )}

      {!isLoading && !error && filteredPosts && filteredPosts.length > 0 && (
        <div className="space-y-4">
          {filteredPosts.map((post, index) => (
            <article
              key={post.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 border border-gray-100 animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex flex-col lg:flex-row justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <Link
                      href={`/posts/${post.slug}`}
                      className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
                    >
                      {post.title}
                    </Link>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        post.status === 'DRAFT'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {post.status}
                    </span>
                  </div>
                  
                  {post.categories && post.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.categories.map((category) => (
                        <span
                          key={category.id}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-gray-600 mb-3 line-clamp-2">
                    {post.body.slice(0, 150)}
                    {post.body.length > 150 ? '…' : ''}
                  </p>
                  <p className="text-sm text-gray-500">
                    {post.status === 'PUBLISHED' && post.published_at
                      ? `Published ${new Date(post.published_at).toLocaleDateString()}`
                      : `Created ${new Date(post.created_at).toLocaleDateString()}`}
                  </p>
                </div>
                
                <div className="flex lg:flex-col gap-2 flex-wrap">
                  {post.status === 'DRAFT' && (
                    <button
                      onClick={() => handlePublishClick(post)}
                      disabled={publishMutation.isPending}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Publish
                    </button>
                  )}
                  <button
                    onClick={() => handleEditClick(post.slug)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(post)}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <PublishModal
        isOpen={!!publishModalPost}
        onClose={() => setPublishModalPost(null)}
        onConfirm={handlePublishConfirm}
        postTitle={publishModalPost?.title || ''}
      />

      <DeleteModal
        isOpen={!!deleteModalPost}
        onClose={() => setDeleteModalPost(null)}
        onConfirm={handleDeleteConfirm}
        postTitle={deleteModalPost?.title || ''}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
