'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';
import Link from 'next/link';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const inputClass =
  'block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/30';

export default function LoginPage() {
  const [authError, setAuthError] = useState('');
  const { login } = useAuth();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setAuthError('');
    try {
      await login(data.username, data.password);
      router.push('/me');
    } catch (error) {
      if (error.response?.status === 401) {
        setAuthError(error.response.data?.detail || 'Invalid credentials');
      } else if (error.response?.status === 429) {
        toast.error(error.response.data?.detail || 'Too many requests');
      } else if (error.request) {
        toast.error('Network error. Please try again.');
      } else {
        toast.error('An error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="bg-white text-zinc-900">
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 sm:py-24">
        <header className="mb-10 border-b border-zinc-200 pb-6">
          <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">Log in</h1>
          <p className="mt-3 text-lg text-zinc-600">Welcome back. Pick up where you left off.</p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-semibold text-zinc-800">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              aria-invalid={!!errors.username}
              {...register('username')}
              className={inputClass}
              placeholder="Enter your username"
            />
            {errors.username && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {errors.username.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-zinc-800">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register('password')}
              className={inputClass}
              placeholder="Enter your password"
            />
            {errors.password && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {errors.password.message}
              </p>
            )}
          </div>

          {authError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-800">{authError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-600">
          Don’t have an account?{' '}
          <Link
            href="/register"
            className="rounded font-semibold text-emerald-700 hover:text-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}