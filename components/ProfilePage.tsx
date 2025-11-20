import React, { useState, useEffect } from 'react';
import { User, NotificationPreferences, UserRole } from '../types';
import { storageService } from '../services/storageService';
import { FeedbackPanel } from './FeedbackPanel';
import { Bell, Shield, Phone, Mail, User as UserIcon, LogOut, LogIn, Check, Lock, Palette, QrCode } from 'lucide-react';
import { Theme, useTheme } from './ThemeContext';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';

interface ProfilePageProps {
  user: User | null;
  onLogout: () => void;
  onLogin: () => void;
  onUpdate: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onLogout, onLogin, onUpdate }) => {
  const { theme, setTheme } = useTheme();
  const defaultPrefs = { likes: true, comments: true, mentions: true, system: true };
  const [prefs, setPrefs] = useState<NotificationPreferences>(
    user?.notificationPreferences || defaultPrefs
  );
  const [saved, setSaved] = useState(false);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<User | null>(user);
  
  // 2FA State
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    if (user) {
        setPrefs(user.notificationPreferences || defaultPrefs);
        setFormData(user);
    }
  }, [user]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    if (!user) return;
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    // Auto save on toggle
    handleSavePrefs(newPrefs);
  };

  const handleSavePrefs = async (newPrefs: NotificationPreferences) => {
    if (!user) return;
    await storageService.updateProfile(user.id, { notificationPreferences: newPrefs });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleProfileSave = () => {
      if (!user || !formData) return;
      storageService.updateProfile(user.id, formData);
      onUpdate();
      setIsEditing(false);
  };

  const start2FASetup = async () => {
      if (!user) return;
      const newSecret = storageService.generate2FASecret();
      setSecret(newSecret);
      
      const totp = new OTPAuth.TOTP({
          issuer: 'PARIVARTAN',
          label: user.email,
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(newSecret)
      });

      const uri = totp.toString();
      const url = await QRCode.toDataURL(uri);
      setQrCodeUrl(url);
      setShow2FASetup(true);
  };

  const confirm2FA = () => {
      if (!user) return;
      const isValid = storageService.verify2FAToken(secret, token);
      if (isValid) {
          storageService.updateProfile(user.id, { twoFactorEnabled: true, twoFactorSecret: secret });
          onUpdate();
          setShow2FASetup(false);
          alert('2FA Enabled Successfully!');
      } else {
          alert('Invalid Code');
      }
  };

  const NotificationToggle = ({ label, description, prefKey }: { label: string, description: string, prefKey: keyof NotificationPreferences }) => (
      <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition">
          <div>
              <p className="font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-500">{description}</p>
          </div>
          <button 
            onClick={() => handleToggle(prefKey)}
            disabled={!user}
            className={`w-12 h-6 rounded-full transition-colors relative ${prefs[prefKey] ? 'bg-primary' : 'bg-gray-300'}`}
          >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${prefs[prefKey] ? 'left-7' : 'left-1'}`} />
          </button>
      </div>
  );

  const ThemeButton = ({ t, color }: { t: Theme, color: string }) => (
      <button 
        onClick={() => setTheme(t)}
        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${theme === t ? 'border-primary scale-110' : 'border-transparent hover:scale-105'}`}
        style={{ backgroundColor: color }}
        title={t.charAt(0).toUpperCase() + t.slice(1)}
      >
         {theme === t && <Check size={16} className="text-white drop-shadow-md" />}
      </button>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6 text-center md:text-left animate-fade-in">
        <div className="relative">
           <img 
             src={user?.avatar || 'https://ui-avatars.com/api/?name=Guest&background=random'} 
             alt={user?.name || 'Guest'} 
             className="w-24 h-24 rounded-full border-4 border-blue-50 object-cover" 
           />
           <div className={`absolute bottom-0 right-0 p-1 rounded-full border-2 border-white text-xs text-white ${user ? 'bg-green-500' : 'bg-gray-400'}`}>
             <UserIcon size={14} />
           </div>
        </div>
        <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{user?.name || 'Welcome, Guest'}</h1>
            <p className="text-gray-500">{user?.email || 'Sign in to access all features'}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${user ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {user?.role || 'VISITOR'}
            </span>
        </div>
        
        {user ? (
            <button 
                onClick={onLogout} 
                className="flex items-center gap-2 px-6 py-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition font-medium"
            >
                <LogOut size={18} />
                <span>Sign Out</span>
            </button>
        ) : (
            <button 
                onClick={onLogin} 
                className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-full hover:bg-blue-700 transition font-medium shadow-md"
            >
                <LogIn size={18} />
                <span>Sign In</span>
            </button>
        )}
      </div>
    
      {/* Authorized Profile Editing */}
      {user && formData && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Profile Details</h2>
                {!isEditing && <button onClick={() => setIsEditing(true)} className="text-primary font-medium hover:bg-blue-50 px-4 py-2 rounded-lg transition">Edit Profile</button>}
            </div>
            
            {isEditing ? (
                <div className="space-y-4 animate-fade-in">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                        <textarea 
                            className="w-full border border-gray-200 rounded-lg p-2 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-primary outline-none" 
                            rows={3}
                            value={formData.bio || ''} 
                            onChange={e => setFormData({...formData, bio: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                            <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <input 
                                className="w-full border border-gray-200 rounded-lg p-2 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-primary outline-none" 
                                value={formData.location || ''} 
                                onChange={e => setFormData({...formData, location: e.target.value})}
                            />
                        </div>
                            <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Twitter / X</label>
                            <input 
                                className="w-full border border-gray-200 rounded-lg p-2 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-primary outline-none" 
                                value={formData.social?.twitter || ''} 
                                onChange={e => setFormData({...formData, social: {...formData.social, twitter: e.target.value}})}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end mt-4">
                            <button onClick={() => setIsEditing(false)} className="text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">Cancel</button>
                        <button onClick={handleProfileSave} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700">Save Changes</button>
                    </div>
                </div>
            ) : (
                <div>
                    <p className="text-gray-600 mb-6 leading-relaxed">{user.bio || "No bio added yet. Tell the community about yourself!"}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <span className="block text-xs text-gray-500 uppercase font-bold mb-1">Location</span>
                            <span className="font-medium text-gray-900">{user.location || "Not specified"}</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <span className="block text-xs text-gray-500 uppercase font-bold mb-1">Social</span>
                            <div className="flex gap-3 text-sm text-primary font-medium">
                                {user.social?.twitter && <a href="#" className="hover:underline">Twitter</a>}
                                {user.social?.linkedin && <a href="#" className="hover:underline">LinkedIn</a>}
                                {!user.social?.twitter && !user.social?.linkedin && <span className="text-gray-400 font-normal">No links added</span>}
                            </div>
                            </div>
                    </div>
                </div>
            )}
        </div>
      )}

      {/* Security Settings (Authorized Only) */}
      {user && (user.role !== UserRole.USER) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
              <h3 className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2"><Shield size={20} /> Two-Factor Authentication</h3>
              
              {!user.twoFactorEnabled ? (
                  !show2FASetup ? (
                      <div>
                          <p className="text-gray-500 mb-4">Secure your account with Google Authenticator.</p>
                          <button onClick={start2FASetup} className="bg-gray-900 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-black transition">
                              <QrCode size={18} /> Enable 2FA
                          </button>
                      </div>
                  ) : (
                      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 animate-fade-in">
                          <div className="flex flex-col md:flex-row gap-8 items-center">
                              <div className="bg-white p-2 border rounded-lg">
                                  <img src={qrCodeUrl} className="w-40 h-40" alt="QR Code" />
                              </div>
                              <div className="flex-1">
                                  <h4 className="font-bold text-gray-900 mb-2">Scan with Authenticator App</h4>
                                  <p className="text-sm text-gray-600 mb-4">
                                      Open Google Authenticator on your phone, scan the QR code, and enter the 6-digit code below to verify.
                                  </p>
                                  <div className="flex gap-2">
                                      <input 
                                          className="border border-gray-300 p-3 rounded-lg w-40 text-center tracking-widest text-xl focus:ring-2 focus:ring-primary outline-none bg-white text-gray-900" 
                                          placeholder="000000" 
                                          maxLength={6}
                                          value={token}
                                          onChange={e => setToken(e.target.value.replace(/\D/g,''))}
                                      />
                                      <button onClick={confirm2FA} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium">Verify</button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )
              ) : (
                  <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-100">
                      <span className="text-green-800 font-medium flex items-center gap-2"><Shield size={18} /> 2FA is active on your account</span>
                      <button className="text-red-500 text-sm hover:underline font-medium">Disable</button>
                  </div>
              )}
          </div>
      )}

      {/* Theme Settings (Visible to All) */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
              <Palette className="text-primary" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Theme Settings</h2>
          </div>
          <div className="flex gap-4 flex-wrap">
             <ThemeButton t="dark" color="#0f172a" />
             <ThemeButton t="light" color="#f8fafc" />
             <ThemeButton t="navy" color="#0a192f" />
             <ThemeButton t="forest" color="#1a2f1a" />
          </div>
          <p className="text-sm text-gray-500 mt-4">Select a theme to customize your experience. Dark mode is enabled by default.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Notification Settings - LOCKED IF NOT LOGGED IN */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
              {!user && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-6">
                      <div className="bg-gray-100 p-3 rounded-full mb-3 text-gray-400">
                          <Lock size={24} />
                      </div>
                      <h3 className="font-bold text-gray-900">Notifications Locked</h3>
                      <p className="text-sm text-gray-500 mb-4">Log in to manage notifications.</p>
                      <button onClick={onLogin} className="text-primary text-sm font-bold hover:underline">Login Now</button>
                  </div>
              )}
              
              <div className="flex items-center gap-2 mb-6">
                  <Bell className="text-primary" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">Notification Settings</h2>
                  {saved && <span className="ml-auto text-xs text-green-600 flex items-center gap-1"><Check size={12}/> Saved</span>}
              </div>
              <div className="space-y-4 opacity-100 transition-opacity">
                  <NotificationToggle label="Likes & Reactions" description="When someone likes your posts" prefKey="likes" />
                  <NotificationToggle label="Comments" description="When someone comments on your posts" prefKey="comments" />
                  <NotificationToggle label="Mentions" description="When you are mentioned in a post" prefKey="mentions" />
                  <NotificationToggle label="System Updates" description="Important announcements and updates" prefKey="system" />
              </div>
          </div>

          {/* Contact & Support - Visible to All */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-fit">
              <div className="flex items-center gap-2 mb-6">
                  <Shield className="text-primary" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">Help & Support</h2>
              </div>
              <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="bg-white p-2 rounded-full text-primary">
                          <Phone size={20} />
                      </div>
                      <div>
                          <p className="text-xs text-gray-500 uppercase font-bold">Emergency / Support</p>
                          <p className="font-bold text-gray-900">9430451687</p>
                      </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="bg-white p-2 rounded-full text-gray-600">
                          <Mail size={20} />
                      </div>
                      <div className="overflow-hidden">
                          <p className="text-xs text-gray-500 uppercase font-bold">Email Support</p>
                          <p className="font-medium text-gray-900 text-sm truncate">abdul.salam.bt.2024@miet.ac.in</p>
                          <p className="font-medium text-gray-900 text-sm truncate">hayatamr9608@gmail.com</p>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Feedback Panel - VISIBLE TO ALL */}
      <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Feedback & Suggestions</h2>
          <FeedbackPanel user={user} />
      </div>

    </div>
  );
};