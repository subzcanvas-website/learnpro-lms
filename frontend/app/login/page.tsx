'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { BookOpen, Phone, Mail, Eye, EyeOff, ArrowRight, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, isAuthenticated, init } = useAuthStore();
  const [tab, setTab] = useState<'otp' | 'email'>('otp');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => { init(); }, []);
  useEffect(() => { if (isAuthenticated) router.push('/dashboard'); }, [isAuthenticated]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) return toast.error('Enter a valid phone number');
    setLoading(true);
    try {
      await authAPI.sendOTP(phone);
      setOtpSent(true);
      setCountdown(60);
      toast.success('OTP sent! (dev: 123456)');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) return toast.error('Enter 6-digit OTP');
    setLoading(true);
    try {
      const { data } = await authAPI.verifyOTP(phone, otp);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      toast.success(`Welcome, ${data.user.name}!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) return toast.error('Fill all fields');
    setLoading(true);
    try {
      const { data } = await authAPI.login(email, password);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-center items-start p-16 w-1/2">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-peach-400 to-primary-600 flex items-center justify-center">
            <BookOpen size={22} className="text-white" />
          </div>
          <span className="text-white text-2xl font-bold">LearnPro</span>
        </div>
        <h1 className="text-5xl font-bold text-white leading-tight mb-6">
          Train smarter.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-peach-300 to-primary-400">
            Grow faster.
          </span>
        </h1>
        <p className="text-gray-300 text-lg mb-10 max-w-md">
          Enterprise-grade LMS with SOPs, quizzes, live classes, gamification and performance tracking — all in one platform.
        </p>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          {[
            { num: '50+', label: 'Course templates' },
            { num: '99%', label: 'Uptime SLA' },
            { num: '10x', label: 'Faster onboarding' },
            { num: '360°', label: 'Performance tracking' },
          ].map(item => (
            <div key={item.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-2xl font-bold text-peach-300">{item.num}</p>
              <p className="text-sm text-gray-400">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-gray-500 text-sm">Sign in to your workspace</p>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-50 rounded-xl p-1 mb-6">
            {[
              { key: 'otp', icon: Phone, label: 'Mobile OTP' },
              { key: 'email', icon: Mail, label: 'Email' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as 'otp' | 'email')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key ? 'bg-white shadow-sm text-peach-500' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <t.icon size={15} />{t.label}
              </button>
            ))}
          </div>

          {tab === 'otp' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Phone Number</label>
                <div className="flex gap-2">
                  <input value="+91" readOnly className="input w-16 text-center text-gray-500 bg-gray-50" />
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9999999999"
                    className="input flex-1"
                    onKeyDown={e => e.key === 'Enter' && !otpSent && handleSendOTP()}
                  />
                </div>
              </div>
              {!otpSent ? (
                <button onClick={handleSendOTP} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <><span>Send OTP</span><ArrowRight size={16} /></>}
                </button>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">Enter OTP</label>
                    <input
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit OTP"
                      className="input text-center text-lg tracking-widest"
                      maxLength={6}
                      onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-400">Dev mode OTP: <strong>123456</strong></p>
                      <button
                        onClick={handleSendOTP}
                        disabled={countdown > 0 || loading}
                        className="text-xs text-peach-500 hover:underline disabled:text-gray-300"
                      >
                        {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                      </button>
                    </div>
                  </div>
                  <button onClick={handleVerifyOTP} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                    {loading ? <RefreshCw size={16} className="animate-spin" /> : <><span>Verify & Login</span><ArrowRight size={16} /></>}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Email Address</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="admin@company.com" className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Password</label>
                <div className="relative">
                  <input
                    value={password} onChange={e => setPassword(e.target.value)}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••" className="input pr-10"
                    onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
                  />
                  <button onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button onClick={handleEmailLogin} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <><span>Sign In</span><ArrowRight size={16} /></>}
              </button>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            By signing in you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}
