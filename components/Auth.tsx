
import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { Loader2, Lock, Mail, ShieldCheck, ArrowRight, Shield, X, Eye, EyeOff } from 'lucide-react';

interface AuthProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export const Auth: React.FC<AuthProps> = ({ isOpen, onClose, onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'auth' | 'verify-email' | '2fa'>('auth');
  const [tempUser, setTempUser] = useState<any>(null);
  const [otpToken, setOtpToken] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate network delay to feel like valid auth process
    await new Promise(resolve => setTimeout(resolve, 500));

    if (isSignUp) {
        setStep('verify-email');
        setLoading(false);
        return;
    }

    // Sign In Flow - Now async to sync with Supabase DB
    try {
        const { user, isNew } = await storageService.authenticate(email);

        if (user.twoFactorEnabled) {
          setTempUser(user);
          setStep('2fa');
          setLoading(false);
        } else {
          storageService.setUser(user);
          onLogin();
          onClose();
        }
    } catch (err) {
        console.error(err);
        setError("Authentication failed. Please try again.");
        setLoading(false);
    }
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    if (tempUser && tempUser.twoFactorSecret) {
      const isValid = storageService.verify2FAToken(tempUser.twoFactorSecret, otpToken);
      if (isValid) {
        storageService.setUser(tempUser);
        onLogin();
        onClose();
      } else {
        setError('Invalid Code.');
        setLoading(false);
      }
    }
  };

  const handleEmailVerifiedMock = async () => {
      // Simulate user clicking email link
      const { user } = await storageService.authenticate(email);
      storageService.setUser(user);
      onLogin();
      onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-white border border-gray-200 p-0 rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden animate-fade-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
            <X size={24} />
        </button>

        {/* Header Gradient */}
        <div className="h-2 bg-gradient-to-r from-primary to-secondary w-full" />
        
        <div className="p-8">
            <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">PARIVARTAN</h1>
            <p className="text-gray-500 text-sm mt-2">
                {step === 'auth' ? (isSignUp ? 'Join the Community' : 'Welcome Back') : 
                 step === 'verify-email' ? 'Check Your Email' : 'Security Check'}
            </p>
            </div>

            {step === 'auth' && (
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="you@example.com"
                    />
                </div>
                </div>
                
                <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
                </div>

                {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>
                  <a href="#" className="text-sm font-medium text-primary hover:text-blue-700">
                    Forgot password?
                  </a>
                </div>

                <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold py-3 rounded-lg transition-all duration-300 flex items-center justify-center shadow-lg shadow-blue-500/20 transform hover:-translate-y-0.5"
                >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="flex items-center gap-2">{isSignUp ? 'Create Account' : 'Sign In'} <ArrowRight size={16} /></span>}
                </button>

                <div className="text-center mt-4">
                    <p className="text-sm text-gray-600">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                        <button 
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="ml-1 text-primary font-semibold hover:underline"
                        >
                            {isSignUp ? 'Sign In' : 'Sign Up'}
                        </button>
                    </p>
                </div>
            </form>
            )}

            {step === 'verify-email' && (
                <div className="text-center space-y-6">
                    <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <p className="text-gray-600">We have sent a confirmation email to <strong>{email}</strong>.</p>
                        <p className="text-sm text-gray-500 mt-2">Please click the link in the email to verify your account.</p>
                    </div>
                    <button 
                        onClick={handleEmailVerifiedMock}
                        className="w-full py-3 border-2 border-primary text-primary font-bold rounded-lg hover:bg-blue-50 transition"
                    >
                        (Simulate) Clicked Email Link
                    </button>
                </div>
            )}

            {step === '2fa' && (
            <form onSubmit={handle2FAVerify} className="space-y-6">
                <div className="text-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <ShieldCheck className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-sm text-gray-700 font-medium">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code from your authenticator app.</p>
                </div>
                
                <div>
                <input
                    type="text"
                    required
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value.replace(/\D/g,''))}
                    className="w-full px-4 py-3 text-center tracking-[0.5em] text-2xl bg-white border-2 border-gray-200 text-gray-900 rounded-lg focus:outline-none focus:border-primary transition-colors"
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                />
                </div>

                {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}

                <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg"
                >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify'}
                </button>
            </form>
            )}
        </div>

        <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
           <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
             <Shield size={10} /> Protected by Supabase
           </p>
        </div>
      </div>
    </div>
  );
};
