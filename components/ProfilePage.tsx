
import React, { useState, useEffect } from 'react';
import { User, NotificationPreferences } from '../types';
import { storageService } from '../services/storageService';
import { FeedbackPanel } from './FeedbackPanel';
import { Bell, Shield, Phone, Mail, User as UserIcon, LogOut, LogIn, Check, Lock, ToggleRight, ToggleLeft } from 'lucide-react';

interface ProfilePageProps {
  user: User | null;
  onLogout: () => void;
  onLogin: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onLogout, onLogin }) => {
  const defaultPrefs = { likes: true, comments: true, mentions: true, system: true };
  const [prefs, setPrefs] = useState<NotificationPreferences>(
    user?.notificationPreferences || defaultPrefs
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
        setPrefs(user.notificationPreferences || defaultPrefs);
    }
  }, [user]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    if (!user) return;
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    // Auto save on toggle
    handleSave(newPrefs);
  };

  const handleSave = async (newPrefs: NotificationPreferences) => {
    if (!user) return;
    await storageService.updateProfile(user.id, { notificationPreferences: newPrefs });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
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

      {/* Settings Grid */}
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

      {/* Feedback Panel - NOW VISIBLE TO ALL */}
      <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Feedback & Suggestions</h2>
          {/* Pass user if exists, otherwise panel handles guest mode */}
          <FeedbackPanel user={user!} />
      </div>

    </div>
  );
};
