'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/contexts/AuthContext';
import {
  useSubscription,
  useBillingPlans,
  useInvoices,
  useUsage,
  useCancelSubscription,
} from '@/hooks/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-300">{label}</span>
        <span className={isNearLimit ? 'text-amber-400' : 'text-slate-400'}>
          {used} / {limit === -1 ? 'Unlimited' : limit}
        </span>
      </div>
      <div className="w-full bg-slate-700/50 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            isNearLimit ? 'bg-amber-500' : 'bg-purple-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function BillingPage() {
  useRequireAuth();
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: plans, isLoading: plansLoading } = useBillingPlans();
  const { data: invoices } = useInvoices();
  const { data: usage } = useUsage();
  const cancelSub = useCancelSubscription();

  const [showCancel, setShowCancel] = useState(false);

  const handleCancel = async () => {
    if (!subscription?._id) return;
    await cancelSub.mutateAsync({ id: subscription._id });
    setShowCancel(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-slate-400">
          <Link href="/settings" className="hover:text-white transition-colors">
            Settings
          </Link>
          <span>/</span>
          <span className="text-white">Billing</span>
        </nav>

        <h1 className="text-3xl font-bold text-white mb-2">Billing & Plans</h1>
        <p className="text-slate-400 mb-8">Manage your subscription and view usage</p>

        {/* Current Plan */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Current Plan</h2>
          {subLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : subscription ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-white capitalize">
                    {subscription.plan}
                  </span>
                  <Badge variant={subscription.status === 'active' ? 'default' : 'destructive'}>
                    {subscription.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  {subscription.billingCycle} billing
                  {subscription.currentPeriodEnd &&
                    ` - Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
                </p>
              </div>
              {subscription.status === 'active' && (
                <Button
                  variant="outline"
                  onClick={() => setShowCancel(true)}
                  className="text-red-400 border-red-500/30 hover:bg-red-900/20"
                >
                  Cancel Plan
                </Button>
              )}
            </div>
          ) : (
            <div>
              <p className="text-white font-medium">Free Plan</p>
              <p className="text-sm text-slate-400">You&apos;re on the free tier</p>
            </div>
          )}
        </div>

        {/* Usage */}
        {usage && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Usage</h2>
            <div className="space-y-4">
              <UsageBar
                label="Projects"
                used={usage.projects?.used || 0}
                limit={usage.projects?.limit || 5}
              />
              <UsageBar
                label="Tasks"
                used={usage.tasks?.used || 0}
                limit={usage.tasks?.limit || 50}
              />
              <UsageBar
                label="Team Members"
                used={usage.members?.used || 0}
                limit={usage.members?.limit || 3}
              />
            </div>
          </div>
        )}

        {/* Plan Comparison */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-6">Available Plans</h2>
          {plansLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : plans && plans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan: any) => {
                const isCurrent = subscription?.plan === plan.name;
                return (
                  <div
                    key={plan.name}
                    className={`rounded-xl border p-6 ${
                      isCurrent ? 'border-purple-500/50 bg-purple-900/20' : 'border-slate-700/50'
                    }`}
                  >
                    <h3 className="text-lg font-bold text-white capitalize">{plan.name}</h3>
                    <p className="text-2xl font-bold text-white mt-2">
                      ${plan.price || 0}
                      <span className="text-sm font-normal text-slate-400">/mo</span>
                    </p>
                    {plan.description && (
                      <p className="text-sm text-slate-400 mt-2">{plan.description}</p>
                    )}
                    <ul className="mt-4 space-y-2 text-sm text-slate-300">
                      {plan.features?.map((f: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="text-green-400">&#10003;</span> {f}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4">
                      {isCurrent ? (
                        <Badge variant="default">Current Plan</Badge>
                      ) : (
                        <Button className="w-full bg-purple-600 hover:bg-purple-500">
                          Upgrade
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  name: 'Free',
                  price: 0,
                  features: ['5 Projects', '50 Tasks/month', '3 Team members', 'Community support'],
                },
                {
                  name: 'Pro',
                  price: 29,
                  features: [
                    'Unlimited Projects',
                    'Unlimited Tasks',
                    '20 Team members',
                    'Priority support',
                    'Advanced analytics',
                  ],
                },
                {
                  name: 'Enterprise',
                  price: 99,
                  features: [
                    'Everything in Pro',
                    'Unlimited members',
                    'SSO & SAML',
                    'Dedicated support',
                    'Custom integrations',
                  ],
                },
              ].map((plan) => {
                const isCurrent = !subscription && plan.name === 'Free';
                return (
                  <div
                    key={plan.name}
                    className={`rounded-xl border p-6 ${
                      isCurrent ? 'border-purple-500/50 bg-purple-900/20' : 'border-slate-700/50'
                    }`}
                  >
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <p className="text-2xl font-bold text-white mt-2">
                      ${plan.price}
                      <span className="text-sm font-normal text-slate-400">/mo</span>
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-slate-300">
                      {plan.features.map((f, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="text-green-400">&#10003;</span> {f}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4">
                      {isCurrent ? (
                        <Badge variant="default">Current Plan</Badge>
                      ) : (
                        <Button className="w-full bg-purple-600 hover:bg-purple-500">
                          {plan.price > 0 ? 'Upgrade' : 'Downgrade'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invoice History */}
        {invoices && invoices.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Invoice History</h2>
            <div className="divide-y divide-slate-700/50">
              {invoices.map((invoice: any) => (
                <div key={invoice._id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-400">{invoice.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">${invoice.amount}</span>
                    <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancel Confirmation */}
        <ConfirmDialog
          open={showCancel}
          onOpenChange={setShowCancel}
          title="Cancel Subscription"
          description="Are you sure you want to cancel your subscription? You'll keep access until the end of your current billing period."
          confirmLabel="Cancel Plan"
          variant="destructive"
          onConfirm={handleCancel}
          isLoading={cancelSub.isPending}
        />
      </div>
    </div>
  );
}
