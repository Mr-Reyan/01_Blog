'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

const inputClass =
  'block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/30';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const readingTime = (body = '') => Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));

const XIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

function FilterChip({ label, onRemove, removeLabel }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white py-1 pl-3 pr-1 text-sm text-zinc-800">
      {label}
      <button
        onClick={onRemove}
        aria-label={removeLabel}
        className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
      >
        <XIcon />
      </button>
    </span>
  );
}

function AllPostsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial values from URL
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('ordering') || '-published_at');
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (debouncedSearch) params.set('search', debouncedSearch);
    if (selectedCategory) params.set('category', selectedCategory);
    if (sortBy !== '-published_at') params.set('ordering', sortBy);

    const queryString = params.toString();
    const newUrl = queryString ? `/posts?${queryString}` : '/posts';

    // Use replace to avoid cluttering history
    router.replace(newUrl, { scroll: false });
  }, [debouncedSearch, selectedCategory, sortBy, router]);

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories/');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch posts with filters
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['allPosts', debouncedSearch, selectedCategory, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedCategory) params.set('category', selectedCategory);
      if (sortBy) params.set('ordering', sortBy);

      const queryString = params.toString();
      const url = queryString ? `/posts/?${queryString}` : '/posts/';
      const response = await api.get(url);
      return response.data;
    },
  });

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('');
    setSortBy('-published_at');
    router.replace('/posts');
  }, [router]);

  const hasActiveFilters = searchQuery || selectedCategory || sortBy !== '-published_at';

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {/* Header */}
        <header className="mb-10 border-b border-zinc-200 pb-6">
          <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">All posts</h1>
          <p className="mt-3 text-lg text-zinc-600">Search and filter stories from our writers.</p>
        </header>

        {/* Search and filters */}
        <div className="mb-8">
          <label htmlFor="search" className="mb-2 block text-sm font-semibold text-zinc-800">
            Search
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or content"
              className={`${inputClass} pl-12 pr-12`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute inset-y-0 right-0 flex items-center rounded-r-lg pr-4 text-zinc-400 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              >
                <XIcon />
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className="mb-2 block text-sm font-semibold text-zinc-800">
                Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={inputClass}
              >
                <option value="">All categories</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sort" className="mb-2 block text-sm font-semibold text-zinc-800">
                Sort by
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={inputClass}
              >
                <option value="-published_at">Latest first</option>
                <option value="published_at">Oldest first</option>
                <option value="title">Title (A-Z)</option>
                <option value="-title">Title (Z-A)</option>
              </select>
            </div>
          </div>

          {/* Active filters and clear */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-4">
              <span className="text-sm font-medium text-zinc-600">Active filters:</span>
              {searchQuery && (
                <FilterChip
                  label={`Search: “${searchQuery}”`}
                  onRemove={() => setSearchQuery('')}
                  removeLabel="Remove search filter"
                />
              )}
              {selectedCategory && (
                <FilterChip
                  label={`Category: ${categories?.find((c) => c.slug === selectedCategory)?.name ?? selectedCategory}`}
                  onRemove={() => setSelectedCategory('')}
                  removeLabel="Remove category filter"
                />
              )}
              {sortBy !== '-published_at' && (
                <FilterChip
                  label={`Sort: ${sortBy === 'published_at' ? 'Oldest first' : sortBy === 'title' ? 'A-Z' : 'Z-A'}`}
                  onRemove={() => setSortBy('-published_at')}
                  removeLabel="Reset sort order"
                />
              )}
              <button
                onClick={handleClearFilters}
                className="ml-auto rounded text-sm font-semibold text-emerald-700 hover:text-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        <div>
          {!isLoading && posts && (
            <p aria-live="polite" className="mb-2 border-b border-zinc-200 pb-3 text-sm text-zinc-600">
              <span className="font-semibold text-zinc-900">{posts.length}</span> post
              {posts.length !== 1 ? 's' : ''} found
            </p>
          )}

          {isLoading && (
            <div className="divide-y divide-zinc-200 animate-pulse" aria-busy="true">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-3 py-8">
                  <div className="h-4 w-24 rounded bg-zinc-100" />
                  <div className="h-7 w-4/5 rounded bg-zinc-100" />
                  <div className="h-4 rounded bg-zinc-100" />
                  <div className="h-4 w-2/3 rounded bg-zinc-100" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6">
              <p className="font-semibold text-red-800">We couldn’t load the posts.</p>
              <p className="mt-1 text-sm text-red-700">Check your connection and try again.</p>
            </div>
          )}

          {!isLoading && !error && (!posts || posts.length === 0) && (
            <div className="py-16 text-center">
              <p className="font-serif text-2xl font-bold">
                {hasActiveFilters ? 'No posts found' : 'No posts yet'}
              </p>
              <p className="mt-2 text-zinc-600">
                {hasActiveFilters
                  ? 'Try a different search or remove a filter.'
                  : 'Check back soon for new stories.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="mt-6 rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!isLoading && !error && posts && posts.length > 0 && (
            <div className="divide-y divide-zinc-200">
              {posts.map((post) => (
                <article key={post.id} className="py-8">
                  {post.categories && post.categories.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {post.categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.slug)}
                          className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <h2 className="font-serif text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
                    <Link
                      href={`/posts/${post.slug}`}
                      className="rounded transition-colors hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                    >
                      {post.title}
                    </Link>
                  </h2>

                  <p className="mt-3 font-serif text-lg leading-8 text-zinc-700">
                    {post.body.slice(0, 250)}
                    {post.body.length > 250 ? '…' : ''}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
                    {post.author && (
                      <span className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white"
                          aria-hidden="true"
                        >
                          {post.author.username.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-medium text-zinc-800">{post.author.username}</span>
                      </span>
                    )}
                    {post.published_at?<span>{formatDate(post.published_at)}</span>:<span className='bg-blue-100 px-2.5 py-0.5 rounded-lg'>DRAFT</span>}
                    
                    <span>{readingTime(post.body)} min read</span>
                  </div>

                  <Link
                    href={`/posts/${post.slug}`}
                    className="mt-4 inline-block rounded text-sm font-semibold text-emerald-700 hover:text-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                  >
                    Read the full post
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// useSearchParams needs a Suspense boundary, or `next build` fails on this page.
export default function AllPostsPage() {
  return (
    <Suspense fallback={null}>
      <AllPostsContent />
    </Suspense>
  );
}