'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

const readingTime = (body = '') => Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));

const excerpt = (body = '', n) => body.slice(0, n) + (body.length > n ? '…' : '');

function Meta({ post }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
      {post.author && (
        <span className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white"
            aria-hidden="true"
          >
            {post.author.username?.charAt(0).toUpperCase()}
          </span>
          <span className="font-medium text-zinc-800">{post.author.username}</span>
        </span>
      )}
      {post.published_at && <span>{formatDate(post.published_at)}</span>}
      <span>{readingTime(post.body)} min read</span>
    </div>
  );
}

function Categories({ categories }) {
  if (!categories || categories.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {categories.slice(0, 2).map((c) => (
        <span key={c.id} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
          {c.name}
        </span>
      ))}
    </div>
  );
}

export default function Home() {
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const response = await api.get('/posts/');
      return response.data;
    },
  });

  const sorted = posts
    ? [...posts].sort((a, b) => new Date(b.published_at) - new Date(a.published_at)).slice(0, 5)
    : [];
  const [featured, ...rest] = sorted;

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Hero */}
      <section className="border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] max-w-3xl">
            Stories and ideas worth a slow read.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600">
            Writers share what they know on any topic. Read something new today, or publish your own.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/posts"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900"
            >
              Browse all posts
            </Link>
            <Link
              href="/create"
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-800 hover:border-zinc-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900"
            >
              Write a post
            </Link>
          </div>
        </div>
      </section>

      {/* Latest posts */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-8 flex items-baseline justify-between border-b border-zinc-200 pb-4">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold">Latest posts</h2>
          {!isLoading && !error && posts && posts.length > 0 && (
            <Link
              href="/posts"
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              View all posts
            </Link>
          )}
        </div>

        {isLoading && (
          <div className="grid gap-10 lg:grid-cols-12 animate-pulse" aria-busy="true">
            <div className="lg:col-span-7 space-y-4">
              <div className="h-4 w-24 rounded bg-zinc-100" />
              <div className="h-10 w-5/6 rounded bg-zinc-100" />
              <div className="h-4 rounded bg-zinc-100" />
              <div className="h-4 w-2/3 rounded bg-zinc-100" />
            </div>
            <div className="lg:col-span-5 space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="h-6 w-4/5 rounded bg-zinc-100" />
                  <div className="h-4 w-1/2 rounded bg-zinc-100" />
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6">
            <p className="font-semibold text-red-800">We couldn’t load the posts.</p>
            <p className="mt-1 text-sm text-red-700">Check your connection and refresh the page.</p>
          </div>
        )}

        {!isLoading && !error && posts && posts.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-serif text-2xl font-bold">No posts yet</p>
            <p className="mt-2 text-zinc-600">Be the first to publish a story.</p>
            <Link
              href="/create"
              className="mt-6 inline-block rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
            >
              Write a post
            </Link>
          </div>
        )}

        {!isLoading && !error && featured && (
          <div className="grid gap-12 lg:grid-cols-12">
            {/* Featured */}
            <article className="lg:col-span-7 lg:pr-8 lg:border-r lg:border-zinc-200">
              <Categories categories={featured.categories} />
              <h3 className="mt-4 font-serif text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
                <Link
                  href={`/posts/${featured.slug}`}
                  className="hover:text-emerald-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded"
                >
                  {featured.title}
                </Link>
              </h3>
              <p className="mt-4 font-serif text-lg leading-8 text-zinc-700 max-w-prose">
                {excerpt(featured.body, 260)}
              </p>
              <div className="mt-6">
                <Meta post={featured} />
              </div>
              <Link
                href={`/posts/${featured.slug}`}
                className="mt-6 inline-block text-sm font-semibold text-emerald-700 hover:text-emerald-900 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              >
                Read the full post
              </Link>
            </article>

            {/* Rest */}
            {rest.length > 0 && (
              <div className="lg:col-span-5 divide-y divide-zinc-200">
                {rest.map((post, i) => (
                  <article key={post.id} className={i === 0 ? 'pb-6' : 'py-6'}>
                    <Categories categories={post.categories} />
                    <h3 className="mt-3 font-serif text-xl font-bold leading-snug">
                      <Link
                        href={`/posts/${post.slug}`}
                        className="hover:text-emerald-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded"
                      >
                        {post.title}
                      </Link>
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 line-clamp-2">
                      {excerpt(post.body, 120)}
                    </p>
                    <div className="mt-3">
                      <Meta post={post} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}