import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <p className="font-serif text-lg font-bold tracking-tight text-zinc-900">MyBlog</p>

        <nav aria-label="Footer" className="flex items-center gap-6 text-sm">
          <Link
            href="/"
            className="rounded font-medium text-zinc-600 transition-colors hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            Home
          </Link>
          <Link
            href="/posts"
            className="rounded font-medium text-zinc-600 transition-colors hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            All posts
          </Link>
        </nav>

        <p className="text-sm text-zinc-500">© 2026 MyBlog.</p>
      </div>
    </footer>
  );
}