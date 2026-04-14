'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { subscriptionAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import {
  Check, Zap, Building2, Rocket, CreditCard,
  Calendar, History, RefreshCw, ShieldCheck
} from 'lucide-react';

declare global { interface Window { Razorpay: any } }

const PLAN_META: Record<string, { icon: any; gradient: string; popular: boolean }> = {
  basic:      { icon: Zap,       gradient: 'from-blue-400 to-blue-600',    popular: false },
  pro:        { icon: Rocket,    gradient: 'from-peach-400 to-primary-600', popular: true  },
  enterprise: { icon: Building2, gradient: 'from-purple-400 to-purple-700', popular: false },
};

export default function SubscriptionPage() {
  const { user } = useAuthStore();
  const [plans, setPlans]             = useState<any[]>([]);
  const [current, setCurrent]         = useState<any>(null);
  const [history, setHistory]         = useState<any[]>([]);
  const [billing, setBilling]         = useState<'monthly' | 'yearly'>('monthly');
  const [paying, setPaying]           = useState<string | null>(null);
  const [tab, setTab]                 = useState<'plans' | 'billing'>('plans');

  useEffect(() => {
    subscriptionAPI.getPlans().then(r => setPlans(r.data)).catch(() => {});
    subscriptionAPI.getCurrent().then(r => setCurrent(r.data)).catch(() => {});
    subscriptionAPI.getHistory().then(r => setHistory(r.data)).catch(() => {});
  }, []);

  const loadRazorpayScript = (): Promise<boolean> =>
    new Promise(resolve => {
      if (window.Razorpay) { resolve(true); return; }
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload  = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const handleSubscribe = async (plan: any) => {
    if (!user) return;
    setPaying(plan.id);
    try {
      const { data: orderData } = await subscriptionAPI.createOrder({
        plan_id: plan.id,
        billing_cycle: billing,
      });

      if (orderData.is_mock) {
        // Dev mock path — skip Razorpay UI
        await subscriptionAPI.verifyPayment({
          payment_id:         orderData.payment_id,
          razorpay_payment_id:`pay_mock_${Date.now()}`,
          razorpay_order_id:  orderData.order.id,
          plan_id:            plan.id,
          billing_cycle:      billing,
        });
        toast.success(`${plan.name} activated! (Mock payment — set real Razorpay keys for live)`);
        const r = await subscriptionAPI.getCurrent();
        setCurrent(r.data);
        return;
      }

      // Real Razorpay checkout
      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error('Failed to load Razorpay SDK'); return; }

      const rzp = new window.Razorpay({
        key:         orderData.key_id,
        amount:      orderData.order.amount,
        currency:    'INR',
        order_id:    orderData.order.id,
        name:        'LearnPro LMS',
        description: `${plan.name} — ${billing}`,
        prefill:     { name: user.name, email: user.email },
        theme:       { color: '#ff7f5c' },
        handler: async (response: any) => {
          try {
            await subscriptionAPI.verifyPayment({
              payment_id:          orderData.payment_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_signature:  response.razorpay_signature,
              plan_id:             plan.id,
              billing_cycle:       billing,
            });
            toast.success(`🎉 ${plan.name} plan activated!`);
            const r = await subscriptionAPI.getCurrent();
            setCurrent(r.data);
            const h = await subscriptionAPI.getHistory();
            setHistory(h.data);
          } catch { toast.error('Payment verification failed'); }
        },
        modal: { ondismiss: () => toast('Payment cancelled') },
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Payment failed');
    } finally {
      setPaying(null);
    }
  };

  const priceFor = (plan: any) =>
    billing === 'yearly' ? (plan.price_yearly ?? plan.price_monthly * 10) : plan.price_monthly;

  const isActive = (plan: any) => current?.plan_name?.toLowerCase() === plan.name.toLowerCase();

  const daysLeft = current?.expires_at
    ? Math.max(0, Math.ceil((new Date(current.expires_at).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <DashboardLayout title="Subscription">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Active plan banner */}
        {current && (
          <div className="rounded-2xl bg-gradient-to-r from-[#1a1a2e] to-[#16213e] p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-peach-500/20 flex items-center justify-center">
                <ShieldCheck size={22} className="text-peach-300" />
              </div>
              <div>
                <p className="text-white font-bold text-lg">{current.plan_name} Plan Active</p>
                <p className="text-white/50 text-sm flex items-center gap-2 mt-0.5">
                  <Calendar size={12} />
                  Expires {new Date(current.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {daysLeft <= 14 && (
                    <span className="text-yellow-400 font-medium">· {daysLeft} days left</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTab('billing')}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-xl border border-white/10 transition-colors"
              >
                <History size={13} /> Billing History
              </button>
            </div>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
          {(['plans', 'billing'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all
                ${tab === t ? 'bg-white shadow text-peach-500' : 'text-gray-400 hover:text-gray-600'}`}>
              {t === 'billing' ? 'Billing History' : 'Plans'}
            </button>
          ))}
        </div>

        {/* ── PLANS TAB ── */}
        {tab === 'plans' && (
          <>
            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-gray-800' : 'text-gray-400'}`}>Monthly</span>
              <button
                onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
                className={`w-12 h-6 rounded-full transition-colors relative ${billing === 'yearly' ? 'bg-peach-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${billing === 'yearly' ? 'translate-x-6 left-0.5' : 'left-0.5'}`} />
              </button>
              <span className={`text-sm font-medium ${billing === 'yearly' ? 'text-gray-800' : 'text-gray-400'}`}>
                Yearly
                <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Save 17%</span>
              </span>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map(plan => {
                const meta  = PLAN_META[plan.slug] || PLAN_META.basic;
                const Icon  = meta.icon;
                const price = priceFor(plan);
                const features: string[] = typeof plan.features === 'string'
                  ? JSON.parse(plan.features) : (plan.features || []);
                const active  = isActive(plan);
                const loading = paying === plan.id;

                return (
                  <div key={plan.id} className={`card p-6 flex flex-col relative
                    ${meta.popular ? 'border-2 border-peach-400 shadow-lg' : ''}
                    ${active ? 'ring-2 ring-green-400' : ''}`}>

                    {meta.popular && !active && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span className="bg-peach-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow">Most Popular</span>
                      </div>
                    )}
                    {active && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span className="bg-green-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow flex items-center gap-1">
                          <Check size={10} strokeWidth={3} /> Active
                        </span>
                      </div>
                    )}

                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center mb-4 shadow-sm`}>
                      <Icon size={22} className="text-white" />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-0.5">{plan.name}</h3>
                    {plan.description && <p className="text-sm text-gray-400 mb-4">{plan.description}</p>}

                    <div className="mb-5">
                      <span className="text-4xl font-black text-gray-900">₹{price?.toLocaleString('en-IN')}</span>
                      <span className="text-gray-400 text-sm ml-1">/{billing === 'yearly' ? 'yr' : 'mo'}</span>
                      {billing === 'yearly' && (
                        <p className="text-xs text-green-600 mt-1">≈ ₹{Math.round(price / 12).toLocaleString('en-IN')}/mo</p>
                      )}
                    </div>

                    <ul className="space-y-2.5 mb-6 flex-1">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                          <Check size={14} className="text-peach-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                          {f}
                        </li>
                      ))}
                      <li className="flex items-start gap-2.5 text-sm text-gray-600">
                        <Check size={14} className="text-peach-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                        {plan.max_users ? `Up to ${plan.max_users} users` : 'Unlimited users'}
                      </li>
                    </ul>

                    <button
                      onClick={() => !active && handleSubscribe(plan)}
                      disabled={!!paying || active}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all
                        ${active
                          ? 'bg-green-50 text-green-600 cursor-default'
                          : meta.popular
                            ? 'bg-peach-500 text-white hover:bg-peach-600 shadow-sm hover:shadow-peach-200/50 hover:shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        } disabled:opacity-60`}
                    >
                      {loading
                        ? <><RefreshCw size={14} className="animate-spin" /> Processing...</>
                        : active
                          ? <><Check size={14} strokeWidth={3} /> Current Plan</>
                          : <><CreditCard size={14} /> Get {plan.name}</>
                      }
                    </button>
                  </div>
                );
              })}
            </div>

            {/* FAQ */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">FAQ</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { q: 'Can I switch plans anytime?',    a: 'Yes. Upgrade or downgrade at any time — changes take effect immediately.' },
                  { q: 'How does billing work?',         a: 'Monthly plans renew each month, yearly plans annually. Cancel anytime before renewal.' },
                  { q: 'What payment methods?',          a: 'All major cards, UPI, net banking, and wallets via Razorpay.' },
                  { q: 'Is my data safe?',               a: 'All payments are processed by Razorpay. We never store card details.' },
                ].map(item => (
                  <div key={item.q} className="bg-gray-50 rounded-xl p-4">
                    <p className="font-medium text-gray-800 text-sm mb-1">{item.q}</p>
                    <p className="text-sm text-gray-500">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── BILLING HISTORY TAB ── */}
        {tab === 'billing' && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="font-semibold text-gray-800">Payment History</h3>
              <p className="text-xs text-gray-400 mt-0.5">All charges to your account</p>
            </div>
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <CreditCard size={36} className="text-gray-200 mb-3" />
                <p className="text-gray-400 text-sm">No payments yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Date', 'Plan', 'Amount', 'Status', 'Gateway ID'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-gray-700">
                        {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-700">{p.plan_name || '—'}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-gray-900">
                        ₹{Number(p.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`badge ${p.status === 'paid' ? 'badge-green' : p.status === 'pending' ? 'badge-yellow' : 'badge-red'} capitalize`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400 font-mono">
                        {p.gateway_payment_id ? p.gateway_payment_id.slice(0, 18) + '…' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
