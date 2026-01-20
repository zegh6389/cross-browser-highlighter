import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-yellow-400" />
            <span className="text-xl font-bold text-slate-900">Web Highlighter</span>
          </div>
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-yellow-400 px-4 py-2 font-medium text-slate-900 hover:bg-yellow-500 transition-colors"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-yellow-400 px-4 py-2 font-medium text-slate-900 hover:bg-yellow-500 transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="py-20 px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
              Highlight the web.
              <br />
              <span className="text-yellow-500">Remember everything.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
              Save highlights from any website, sync across all your devices, and organize your research. 
              Start free with 300 words, then upgrade for unlimited highlights.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/signup"
                className="rounded-lg bg-yellow-400 px-8 py-3 text-lg font-semibold text-slate-900 hover:bg-yellow-500 transition-colors shadow-lg shadow-yellow-400/30"
              >
                Start for free
              </Link>
              <Link
                href="#features"
                className="rounded-lg border border-slate-300 px-8 py-3 text-lg font-semibold text-slate-700 hover:border-slate-400 transition-colors"
              >
                Learn more
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4 bg-white">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
              Everything you need to capture knowledge
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon="🎨"
                title="Multiple Colors"
                description="Organize highlights with yellow, green, blue, and pink colors. Add notes to remember context."
              />
              <FeatureCard
                icon="☁️"
                title="Cloud Sync"
                description="Your highlights sync automatically across all your devices. Never lose your research."
              />
              <FeatureCard
                icon="🔍"
                title="Search & Filter"
                description="Find any highlight instantly with full-text search. Filter by color, date, or website."
              />
              <FeatureCard
                icon="⚡"
                title="Keyboard Shortcuts"
                description="Highlight faster with Alt+Q (yellow) and Alt+W (green). Power users love it."
              />
              <FeatureCard
                icon="🔒"
                title="Private & Secure"
                description="Your data is encrypted and private. We never sell your information."
              />
              <FeatureCard
                icon="📤"
                title="Export Anytime"
                description="Export all your highlights to JSON or CSV. Your data belongs to you."
              />
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 px-4">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-center text-slate-600 mb-12">
              Start free, upgrade when you need more
            </p>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Free Plan */}
              <div className="rounded-2xl border border-slate-200 bg-white p-8">
                <h3 className="text-xl font-semibold text-slate-900">Free</h3>
                <p className="mt-2 text-slate-600">Perfect for getting started</p>
                <div className="mt-6">
                  <span className="text-4xl font-bold text-slate-900">$0</span>
                  <span className="text-slate-600">/month</span>
                </div>
                <ul className="mt-8 space-y-4">
                  <PricingFeature included>300 words of highlights</PricingFeature>
                  <PricingFeature included>Cloud sync</PricingFeature>
                  <PricingFeature included>All highlight colors</PricingFeature>
                  <PricingFeature included>Notes on highlights</PricingFeature>
                  <PricingFeature included>Export to JSON/CSV</PricingFeature>
                  <PricingFeature>Unlimited highlights</PricingFeature>
                  <PricingFeature>Priority support</PricingFeature>
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 block w-full rounded-lg border border-slate-300 py-3 text-center font-semibold text-slate-700 hover:border-slate-400 transition-colors"
                >
                  Get Started
                </Link>
              </div>

              {/* Pro Plan */}
              <div className="rounded-2xl border-2 border-yellow-400 bg-white p-8 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-3 py-1 text-sm font-semibold text-slate-900">
                  Most Popular
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Pro</h3>
                <p className="mt-2 text-slate-600">For power users and researchers</p>
                <div className="mt-6">
                  <span className="text-4xl font-bold text-slate-900">$9.99</span>
                  <span className="text-slate-600">/month</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">or $99.99/year (save 17%)</p>
                <ul className="mt-8 space-y-4">
                  <PricingFeature included>Unlimited highlights</PricingFeature>
                  <PricingFeature included>Cloud sync</PricingFeature>
                  <PricingFeature included>All highlight colors</PricingFeature>
                  <PricingFeature included>Notes on highlights</PricingFeature>
                  <PricingFeature included>Export to JSON/CSV</PricingFeature>
                  <PricingFeature included>Unlimited highlights</PricingFeature>
                  <PricingFeature included>Priority support</PricingFeature>
                </ul>
                <Link
                  href="/signup?plan=pro"
                  className="mt-8 block w-full rounded-lg bg-yellow-400 py-3 text-center font-semibold text-slate-900 hover:bg-yellow-500 transition-colors"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-slate-900">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to start highlighting?
            </h2>
            <p className="text-slate-400 mb-8">
              Join thousands of researchers, students, and professionals who use Web Highlighter daily.
            </p>
            <Link
              href="/signup"
              className="inline-block rounded-lg bg-yellow-400 px-8 py-3 text-lg font-semibold text-slate-900 hover:bg-yellow-500 transition-colors"
            >
              Get Started for Free
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-yellow-400" />
              <span className="font-semibold text-slate-900">Web Highlighter</span>
            </div>
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Web Highlighter. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-6 hover:border-yellow-400 transition-colors">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600">{description}</p>
    </div>
  );
}

function PricingFeature({ children, included = false }: { children: React.ReactNode; included?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      {included ? (
        <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span className={included ? 'text-slate-700' : 'text-slate-400'}>{children}</span>
    </li>
  );
}
