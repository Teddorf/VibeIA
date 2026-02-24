'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Build Apps
            </span>
            <br />
            <span className="text-white">with AI Power</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            VibeCoding AI transforms your ideas into production-ready code. Define your vision, let
            AI handle the complexity.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold rounded-xl text-lg transition-all shadow-lg shadow-purple-500/25"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-lg transition-all border border-slate-700"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            {
              step: '1',
              title: 'Describe Your Vision',
              description: 'Tell us what you want to build in plain language',
              icon: '💭',
            },
            {
              step: '2',
              title: 'Answer Questions',
              description: 'Our wizard guides you through business requirements',
              icon: '📋',
            },
            {
              step: '3',
              title: 'Review the Plan',
              description: 'See the generated architecture and task breakdown',
              icon: '🗺️',
            },
            {
              step: '4',
              title: 'Execute & Deploy',
              description: 'Watch as AI generates quality-checked code',
              icon: '🚀',
            },
          ].map((feature) => (
            <div
              key={feature.step}
              className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 text-center hover:border-purple-500/50 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-4 text-2xl">
                {feature.icon}
              </div>
              <div className="text-sm text-purple-400 font-medium mb-2">Step {feature.step}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-8">
            <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
              <svg
                className="w-7 h-7 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Quality Guaranteed</h3>
            <p className="text-slate-400">
              Every line of code passes through lint checks, security scans, and automated tests.
            </p>
          </div>
          <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-8">
            <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
              <svg
                className="w-7 h-7 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Multi-LLM Powered</h3>
            <p className="text-slate-400">
              Leverage Claude, GPT-4, and Gemini with intelligent fallback for best results.
            </p>
          </div>
          <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-8">
            <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
              <svg
                className="w-7 h-7 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Git Integrated</h3>
            <p className="text-slate-400">
              Automatic GitHub repository creation, commits, and version control built-in.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to Build Something Amazing?</h2>
        <p className="text-lg text-slate-400 mb-8">
          Join developers who are shipping faster with AI assistance.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold rounded-xl text-lg transition-all shadow-lg shadow-purple-500/25"
        >
          Start Building Now
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} VibeCoding AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
