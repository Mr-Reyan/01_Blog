'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const editPostSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  body: z.string().min(10, 'Body must be at least 10 characters'),
  categories: z.array(z.string()).min(1, 'Select at least 1 category').max(3, 'Maximum 3 categories'),
});

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/30';

const FieldError = ({ children }) =>
  children ? (
    <p role="alert" className="mt-2 text-sm text-red-700">
      {children}
    </p>
  ) : null;

export default function EditPostPage() {
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [categoryLimitMessage, setCategoryLimitMessage] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const { data: post, isLoading: postLoading, error: postError } = useQuery({
    queryKey: ['post', params.slug],
    queryFn: async () => {
      const response = await api.get(`/posts/${params.slug}/`);
      return response.data;
    },
    enabled: !!user,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories/');
      return response.data;
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editPostSchema),
    defaultValues: {
      title: '',
      body: '',
      categories: [],
    },
  });

  const selectedCategories = watch('categories');

  // Populate form when post loads
  useEffect(() => {
    if (post) {
      // Check if user is the author
      if ((post.author && user && post.author.username !== user.username && user.role!="ADMIN")) {
        toast.error('You do not have permission to edit this post');
        router.push('/me');
        return;
      }

      reset({
        title: post.title,
        body: post.body,
        categories: post.categories?.map(cat => cat.id) || [],
      });
    }
  }, [post, reset, user, router]);

  const updatePostMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.patch(`/posts/${params.slug}/`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['post', params.slug]);
      queryClient.invalidateQueries({ queryKey: ['myPosts'] });
      queryClient.invalidateQueries(['posts']);
      queryClient.invalidateQueries(['allPosts']);
      toast.success('Post updated successfully!');
      router.push('/me');
    },
    onError: (error) => {
      if (error.response?.status === 400) {
        const errors = error.response.data;
        if (errors.title) {
          setError('title', { message: Array.isArray(errors.title) ? errors.title[0] : errors.title });
        }
        if (errors.body) {
          setError('body', { message: Array.isArray(errors.body) ? errors.body[0] : errors.body });
        }
        if (errors.categories) {
          setError('categories', { message: Array.isArray(errors.categories) ? errors.categories[0] : errors.categories });
        }
      } else if (error.response?.status === 403) {
        router.push('/me');
      } else if (error.response?.status === 404) {
        toast.error('Post not found');
        router.push('/me');
      } else if (error.request) {
        toast.error('Network error. Please try again.');
      } else {
        toast.error('An error occurred. Please try again.');
      }
    },
  });

  const onSubmit = (data) => {
    updatePostMutation.mutate(data);
  };

  if (authLoading || postLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 animate-pulse" aria-busy="true">
          <div className="h-10 w-1/3 rounded bg-zinc-100 mb-8" />
          <div className="h-12 rounded bg-zinc-100 mb-6" />
          <div className="h-64 rounded bg-zinc-100 mb-6" />
          <div className="h-12 w-1/4 rounded bg-zinc-100" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (postError) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">We couldn’t load this post</h1>
          <p className="mt-4 text-lg text-zinc-600">
            The post may not exist, or you may not have permission to edit it.
          </p>
          <button
            onClick={() => router.push('/my-posts')}
            className="mt-8 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900"
          >
            Back to my posts
          </button>
        </div>
      </div>
    );
  }

  const noCategoriesAvailable = !categoriesLoading && (!categories || categories.length === 0);

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <header className="mb-10 border-b border-zinc-200 pb-6">
          <h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight">Edit post</h1>
          <p className="mt-3 text-lg text-zinc-600">Update the title, content and categories.</p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8" noValidate>
          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-semibold text-zinc-800">
              Title
            </label>
            <input
              id="title"
              type="text"
              maxLength={200}
              placeholder="Give your post a clear title"
              aria-invalid={!!errors.title}
              {...register('title')}
              className={`${inputClass} font-serif text-xl`}
            />
            <div className="mt-1 flex justify-between">
              <FieldError>{errors.title?.message}</FieldError>
              <span className="ml-auto text-xs text-zinc-500">{watch('title')?.length || 0}/200</span>
            </div>
          </div>

          <div>
            <label htmlFor="body" className="mb-2 block text-sm font-semibold text-zinc-800">
              Content
            </label>
            <textarea
              id="body"
              rows={12}
              maxLength={600}
              placeholder="Write your post here"
              aria-invalid={!!errors.body}
              {...register('body')}
              className={`${inputClass} resize-none font-serif text-lg leading-8`}
            />
            <div className="mt-1 flex justify-between">
              <FieldError>{errors.body?.message}</FieldError>
              <span className="ml-auto text-xs text-zinc-500">{watch('body')?.length || 0}/600</span>
            </div>
          </div>

          <fieldset>
            <legend className="mb-1 text-sm font-semibold text-zinc-800">
              Categories{' '}
              {categoriesLoading && <span className="font-normal text-zinc-500">(loading…)</span>}
            </legend>
            <p className="mb-3 text-sm text-zinc-500">
              Pick 1 to 3. Selected: {selectedCategories.length}/3
            </p>

            {noCategoriesAvailable && (
              <p className="mb-2 text-sm text-red-700">No categories available. Ask an admin to add some.</p>
            )}

            <Controller
              name="categories"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {categories?.map((category) => {
                    const checked = field.value.includes(category.id);
                    return (
                      <label
                        key={category.id}
                        className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-emerald-700 focus-within:ring-offset-2 ${
                          checked
                            ? 'border-emerald-700 bg-emerald-700 text-white'
                            : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-900'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          value={category.id}
                          checked={checked}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            const value = e.target.value;

                            if (isChecked) {
                              if (field.value.length >= 3) {
                                setCategoryLimitMessage('You can pick up to 3 categories.');
                                setTimeout(() => setCategoryLimitMessage(''), 3000);
                                return;
                              }
                              field.onChange([...field.value, value]);
                            } else {
                              field.onChange(field.value.filter((v) => v !== value));
                            }
                          }}
                        />
                        {category.name}
                      </label>
                    );
                  })}
                </div>
              )}
            />

            {categoryLimitMessage && (
              <p role="status" className="mt-3 text-sm text-amber-700">
                {categoryLimitMessage}
              </p>
            )}

            <FieldError>{errors.categories?.message}</FieldError>
          </fieldset>

          <div className="flex items-center gap-3 border-t border-zinc-200 pt-6">
            <button
              type="submit"
              disabled={isSubmitting || noCategoriesAvailable}
              className="rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:hover:bg-zinc-300"
            >
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/my-posts')}
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-800 hover:border-zinc-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}