
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Home, MessageSquare, Calendar, Image as ImageIcon, LogOut, Menu, X, Briefcase, Shield, QrCode, Users, UserCog, Settings, Phone, Mail, ArrowRight, MessageCircle, Heart, FileText, ClipboardCheck } from 'lucide-react';
import { User, UserRole, StartupConfig } from './types';
import { storageService } from './services/storageService';
import { Auth } from './components/Auth';
import { HeroCarousel } from './components/HeroCarousel';
import { Feed } from './components/Feed';
import { ChatInterface } from './components/ChatInterface';
import { AIStudio } from './components/AIStudio';
import { EventManager } from './components/EventManager';
import { Assistant } from './components/Assistant';
import { SundayAttendance } from './components/SundayAttendance';
import { FeedbackPanel } from './components/FeedbackPanel';
import { ProfilePage } from './components/ProfilePage';
import { ThemeProvider } from './components/ThemeContext';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';

const NavLink = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${isActive ? 'bg-blue-50 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
};

// Bottom Navigation for Mobile
const BottomNav = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 md:hidden flex justify-between items-center z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <Link to="/" className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${isActive('/') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
        <Home size={24} strokeWidth={isActive('/') ? 2.5 : 2} />
        <span className="text-[10px] font-medium">Home</span>
      </Link>
      <Link to="/feed" className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${isActive('/feed') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
        <FileText size={24} strokeWidth={isActive('/feed') ? 2.5 : 2} />
        <span className="text-[10px] font-medium">Posts</span>
      </Link>
      <Link to="/events" className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${isActive('/events') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
        <Calendar size={24} strokeWidth={isActive('/events') ? 2.5 : 2} />
        <span className="text-[10px] font-medium">Events</span>
      </Link>
      <Link to="/donate" className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${isActive('/donate') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
        <Heart size={24} strokeWidth={isActive('/donate') ? 2.5 : 2} />
        <span className="text-[10px] font-medium">Donate</span>
      </Link>
       <Link to="/profile" className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${isActive('/profile') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
        <Settings size={24} strokeWidth={isActive('/profile') ? 2.5 : 2} />
        <span className="text-[10px] font-medium">Settings</span>
      </Link>
    </div>
  );
};

// Startup Popup Component
const StartupPopup = () => {
    const [config, setConfig] = useState<StartupConfig | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const loadConfig = async () => {
            const c = await storageService.getStartupConfig();
            if (c && c.enabled) {
                const seen = sessionStorage.getItem('popup_seen');
                if (!seen) {
                    setConfig(c);
                    setVisible(true);
                    sessionStorage.setItem('popup_seen', 'true');
                }
            }
        };
        loadConfig();
    }, []);

    if (!visible || !config) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in-up relative">
                <div className="bg-primary h-2 w-full"></div>
                <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{config.title}</h2>
                    <p className="text-gray-600 leading-relaxed mb-8 whitespace-pre-wrap">{config.message}</p>
                    <button 
                        onClick={() => setVisible(false)}
                        className="bg-primary text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-blue-700 transition w-full"
                    >
                        Get Started
                    </button>
                </div>
            </div>
        </div>
    );
};

// Admin Panel Component
const AdminPanel = ({ currentUser }: { currentUser: User }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [startupConfig, setStartupConfig] = useState<StartupConfig>({ enabled: true, title: '', message: '' });
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const loadAdminData = async () => {
            const [usrs, cfg] = await Promise.all([
                storageService.getAllUsers(),
                storageService.getStartupConfig()
            ]);
            setUsers(usrs);
            setStartupConfig(cfg);
            setLoading(false);
        };
        loadAdminData();
    }, []);

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        await storageService.updateUserRole(userId, newRole);
        const updatedUsers = await storageService.getAllUsers();
        setUsers(updatedUsers);
    };

    const handleSaveConfig = async () => {
        await storageService.saveStartupConfig(startupConfig);
        alert("Startup configuration saved!");
    };

    if (loading) return <div className="p-12 text-center">Loading Admin Panel...</div>;

    // Sort users by hierarchy: Super Admin -> Admin -> Member -> User
    const sortedUsers = [...users].sort((a, b) => {
        const priority = { [UserRole.SUPER_ADMIN]: 0, [UserRole.ADMIN]: 1, [UserRole.MEMBER]: 2, [UserRole.USER]: 3 };
        return (priority[a.role] || 3) - (priority[b.role] || 3);
    });

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            {/* Role Management (Super Admin Only) */}
            {currentUser.role === UserRole.SUPER_ADMIN && (
                <div className="mb-10">
                    <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                        <UserCog className="text-primary" /> User & Role Management
                    </h2>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-4">User</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Current Role</th>
                                    <th className="p-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sortedUsers.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-50">
                                        <td className="p-4 flex items-center gap-3">
                                            <img src={u.avatar} className="w-8 h-8 rounded-full" />
                                            <span className="font-medium text-gray-900">{u.name}</span>
                                        </td>
                                        <td className="p-4 text-gray-600">{u.email}</td>
                                        <td className="p-4">
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                                u.role === UserRole.SUPER_ADMIN ? 'bg-purple-100 text-purple-700' :
                                                u.role === UserRole.ADMIN ? 'bg-blue-100 text-blue-700' :
                                                u.role === UserRole.MEMBER ? 'bg-green-100 text-green-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>{u.role}</span>
                                        </td>
                                        <td className="p-4">
                                            <select 
                                                value={u.role} 
                                                onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                                className="text-sm border rounded p-1 cursor-pointer bg-white"
                                                disabled={u.email === 'abdul.salam.bt.2024@miet.ac.in' || u.email === 'hayatamr9608@gmail.com'}
                                            >
                                                <option value={UserRole.USER}>User</option>
                                                <option value={UserRole.MEMBER}>Member</option>
                                                <option value={UserRole.ADMIN}>Admin</option>
                                                <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Startup Message Configuration (Admins & Super Admins) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                    <MessageCircle className="text-primary" /> Startup Popup Message
                </h2>
                <div className="space-y-4 max-w-2xl">
                    <div className="flex items-center gap-2 mb-2">
                        <input 
                            type="checkbox" 
                            id="popupEnabled"
                            checked={startupConfig.enabled}
                            onChange={e => setStartupConfig({...startupConfig, enabled: e.target.checked})}
                            className="w-4 h-4 text-primary"
                        />
                        <label htmlFor="popupEnabled" className="font-medium text-gray-700">Enable Startup Popup</label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input 
                            className="w-full border p-2 rounded-lg"
                            value={startupConfig.title}
                            onChange={e => setStartupConfig({...startupConfig, title: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <textarea 
                            className="w-full border p-2 rounded-lg h-32"
                            value={startupConfig.message}
                            onChange={e => setStartupConfig({...startupConfig, message: e.target.value})}
                        />
                    </div>
                    <button onClick={handleSaveConfig} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

const HomeLayout = ({ user, onLogin }: { user: User | null, onLogin: () => void }) => {
    return (
    <div className="pb-4">
        <HeroCarousel userRole={user?.role || UserRole.USER} />
        <div className="max-w-4xl mx-auto mt-8 px-4">
            {/* Removed Quick Action Buttons as requested */}
            
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase size={20} className="text-primary" /> Community Feed
            </h2>
            <Feed currentUser={user} onLoginRequest={onLogin} />
        </div>
        {/* Chatbot Assistant - Only on Home Page */}
        <Assistant />
    </div>
    );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [, forceUpdate] = useState({}); 

  useEffect(() => {
    const storedUser = storageService.getUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const handleLogin = () => {
    const u = storageService.getUser();
    setUser(u);
    setShowAuth(false);
  };

  const handleLogout = () => {
    storageService.clearUser();
    setUser(null);
    window.location.hash = '/';
  };

  const handleProfileUpdate = () => {
      const u = storageService.getUser();
      setUser(u);
      forceUpdate({});
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center text-primary"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div></div>;

  return (
    <ThemeProvider>
      <HashRouter>
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-slate-800">
          {/* Global Popup */}
          <StartupPopup />

          {/* Auth Modal */}
          <Auth isOpen={showAuth} onClose={() => setShowAuth(false)} onLogin={handleLogin} />

          {/* Header */}
          <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm/50 backdrop-blur-md bg-white/90">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex justify-between items-center h-16">
                      <Link to="/" className="font-extrabold text-primary text-2xl tracking-tight flex items-center gap-2">
                          PARIVARTAN
                      </Link>

                      {/* Search Bar */}
                      <div className="hidden md:block flex-1 max-w-md mx-8">
                          <input 
                              type="text" 
                              placeholder="Search members, posts, or events..." 
                              className="w-full bg-gray-100 border-transparent rounded-full px-5 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                              value={searchTerm}
                              onChange={e => setSearchTerm(e.target.value)}
                          />
                      </div>

                      {/* Desktop Nav */}
                      <nav className="hidden md:flex items-center gap-1">
                          <NavLink to="/" icon={Home} label="Home" />
                          
                          {/* Protected Routes Visibility */}
                          {user && user.role !== UserRole.USER && (
                              <>
                                  <NavLink to="/chat" icon={MessageSquare} label="Chat" />
                                  <NavLink to="/studio" icon={ImageIcon} label="AI Studio" />
                                  <NavLink to="/attendance" icon={ClipboardCheck} label="Attendance" />
                              </>
                          )}
                          <NavLink to="/events" icon={Calendar} label="Events" />
                          
                          {user && (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) && (
                              <NavLink to="/admin" icon={Users} label="Admin" />
                          )}
                      </nav>

                      <div className="hidden md:flex items-center gap-4 ml-4">
                          {user ? (
                              <>
                                  <Link to="/profile" className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-full transition">
                                      <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-gray-200" />
                                      <span>{user.name.split(' ')[0]}</span>
                                  </Link>
                                  <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition p-2" title="Logout">
                                      <LogOut size={20} />
                                  </button>
                              </>
                          ) : (
                              <button 
                                  onClick={() => setShowAuth(true)}
                                  className="bg-primary hover:bg-blue-700 text-white px-6 py-2 rounded-full font-semibold transition shadow-md"
                              >
                                  Join / Login
                              </button>
                          )}
                      </div>

                      {/* Mobile Menu Button */}
                      <div className="md:hidden flex items-center">
                           <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-600 p-2">
                              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                           </button>
                      </div>
                  </div>
              </div>

              {/* Mobile Nav */}
              {mobileMenuOpen && (
                  <div className="md:hidden bg-white border-t border-gray-100 p-4 space-y-2 animate-fade-in shadow-xl absolute w-full z-40">
                      <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 hover:bg-gray-50 rounded-lg font-medium">Home</Link>
                      <Link to="/feed" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 hover:bg-gray-50 rounded-lg font-medium">Posts</Link>
                      <Link to="/events" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 hover:bg-gray-50 rounded-lg font-medium">Events</Link>
                      
                      <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 hover:bg-gray-50 rounded-lg font-medium">
                          {user ? 'My Profile & Settings' : 'Settings (Guest)'}
                      </Link>
                      
                      {user && (
                          <>
                              {user.role !== UserRole.USER && (
                                  <>
                                      <Link to="/chat" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 hover:bg-gray-50 rounded-lg font-medium">Chat</Link>
                                      <Link to="/studio" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 hover:bg-gray-50 rounded-lg font-medium">AI Studio</Link>
                                      <Link to="/attendance" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 hover:bg-gray-50 rounded-lg font-medium">Attendance</Link>
                                  </>
                              )}
                              {(user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) && (
                                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 hover:bg-gray-50 rounded-lg font-medium">Admin Panel</Link>
                              )}
                              <button onClick={handleLogout} className="w-full text-left py-3 px-4 text-red-500 font-medium mt-2 hover:bg-red-50 rounded-lg">Logout</button>
                          </>
                      )}
                      {!user && (
                          <button onClick={() => { setMobileMenuOpen(false); setShowAuth(true); }} className="w-full bg-primary text-white py-3 rounded-xl font-bold mt-4">
                              Sign In / Sign Up
                          </button>
                      )}
                  </div>
              )}
          </header>

          <main className="flex-1 pb-20 md:pb-0">
              <Routes>
                  <Route path="/" element={<HomeLayout user={user} onLogin={() => setShowAuth(true)} />} />
                  <Route path="/feed" element={<div className="max-w-2xl mx-auto pt-4"><h2 className="text-2xl font-bold px-4 mb-4">Posts</h2><Feed currentUser={user} onLoginRequest={() => setShowAuth(true)} /></div>} />
                  <Route path="/events" element={<EventManager currentUser={user} />} />
                  <Route path="/donate" element={<EventManager currentUser={user} defaultTab="donate" />} />
                  
                  {/* Profile accessible to all now */}
                  <Route path="/profile" element={<ProfilePage user={user} onLogout={handleLogout} onLogin={() => setShowAuth(true)} onUpdate={handleProfileUpdate} />} />
                  
                  {/* Protected Routes */}
                  <Route path="/chat" element={user && user.role !== UserRole.USER ? <ChatInterface currentUser={user} /> : <Navigate to="/" />} />
                  <Route path="/studio" element={user && user.role !== UserRole.USER ? <AIStudio /> : <Navigate to="/" />} />
                  <Route path="/attendance" element={user && user.role !== UserRole.USER ? <SundayAttendance currentUser={user} /> : <Navigate to="/" />} />
                  <Route path="/admin" element={user && (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) ? <AdminPanel currentUser={user} /> : <Navigate to="/" />} />
                  
                  <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
          </main>

          <BottomNav />

          {/* Minimal Footer as requested */}
          <footer className="bg-white border-t border-gray-200 py-6 mt-auto hidden md:block">
              <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
                   &copy; {new Date().getFullYear()} PARIVARTAN. All rights reserved.
              </div>
          </footer>
        </div>
      </HashRouter>
    </ThemeProvider>
  );
};

export default App;
