'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { rawAxios } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(150, 'Username must be at most 150 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const inputClass =
  'block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/30';

const FieldError = ({ children }) =>
  children ? (
    <p role="alert" className="mt-2 text-sm text-red-700">
      {children}
    </p>
  ) : null;

export default function RegisterPage() {
  const [fieldErrors, setFieldErrors] = useState({});
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    setFieldErrors({});
    try {
      await rawAxios.post('/auth/register/', {
        username: data.username,
        password: data.password,
      });
      toast.success('Registration successful! Please login.');
      router.push('/login');
    } catch (error) {
      if (error.response?.status === 400) {
        const responseErrors = error.response.data;
        const mappedErrors = {};

        if (responseErrors.username) {
          mappedErrors.username = Array.isArray(responseErrors.username)
            ? responseErrors.username.join(' ')
            : responseErrors.username;
        }
        if (responseErrors.password) {
          mappedErrors.password = Array.isArray(responseErrors.password)
            ? responseErrors.password.join(' ')
            : responseErrors.password;
        }

        setFieldErrors(mappedErrors);
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
          <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">Create account</h1>
          <p className="mt-3 text-lg text-zinc-600">Join to write posts and join the conversation.</p>
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
              aria-invalid={!!(errors.username || fieldErrors.username)}
              {...register('username')}
              className={inputClass}
              placeholder="Choose a username"
            />
            <FieldError>{errors.username?.message}</FieldError>
            <FieldError>{fieldErrors.username}</FieldError>
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-zinc-800">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!(errors.password || fieldErrors.password)}
              {...register('password')}
              className={inputClass}
              placeholder="At least 8 characters"
            />
            <FieldError>{errors.password?.message}</FieldError>
            <FieldError>{fieldErrors.password}</FieldError>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-zinc-800">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
              className={inputClass}
              placeholder="Re-enter your password"
            />
            <FieldError>{errors.confirmPassword?.message}</FieldError>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-600">
          Already have an account?{' '}
          <Link
            href="/login"
            className="rounded font-semibold text-emerald-700 hover:text-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}