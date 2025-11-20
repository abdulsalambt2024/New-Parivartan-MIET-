
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { UserRole, User, AttendanceSession, AttendanceEntry } from '../types';
import { Calendar as CalendarIcon, UserCheck, ChevronLeft, ChevronRight, Lock, Save, Edit3, Trophy, Medal, ShieldAlert, Loader2 } from 'lucide-react';

interface Props {
  currentUser: User;
}

export const SundayAttendance: React.FC<Props> = ({ currentUser }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(null);
  const [authorizedUsers, setAuthorizedUsers] = useState<User[]>([]);
  const [badges, setBadges] = useState<{user: User, badge: any}[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to format date as YYYY-MM-DD
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
      setLoading(true);
      const sess = await storageService.getAttendanceSessions();
      setSessions(sess);
      
      const allUsers = await storageService.getAllUsers();
      // Filter authorized users (Members, Admins, Super Admins)
      const authUsers = allUsers.filter(u => u.role !== UserRole.USER);
      setAuthorizedUsers(authUsers);

      // Calculate Badges for display
      const badgedUsers = allUsers
        .filter(u => u.badges && u.badges.some(b => b.month === currentDate.toISOString().substring(0, 7)))
        .map(u => ({
            user: u,
            badge: u.badges?.find(b => b.month === currentDate.toISOString().substring(0, 7))
        }))
        .sort((a, b) => {
            const order = { gold: 3, silver: 2, bronze: 1 };
            return (order[b.badge.type as keyof typeof order] || 0) - (order[a.badge.type as keyof typeof order] || 0);
        });
      setBadges(badgedUsers);
      setLoading(false);
  };

  // Authorization Check
  if (currentUser.role === UserRole.USER) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
            <div className="bg-red-50 p-4 rounded-full mb-4">
                <ShieldAlert size={48} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
            <p className="text-gray-500 mt-2 max-w-md">
                Sunday Visit Attendance is restricted to authorized personnel.
            </p>
        </div>
    );
  }

  if (loading) {
      return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={48} /></div>;
  }

  // Calendar Logic
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const handleDateClick = (day: number) => {
      const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateStr = formatDate(clickedDate);
      setSelectedDate(dateStr);

      // Find existing session or create template
      const existing = sessions.find(s => s.date === dateStr);
      if (existing) {
          setCurrentSession(JSON.parse(JSON.stringify(existing))); // Deep copy
      } else {
          setCurrentSession({
              date: dateStr,
              villageName: 'Sunday Visit',
              entries: authorizedUsers.map(u => ({ userId: u.id, userName: u.name, status: 'absent' })),
              markedBy: '',
              submitted: false
          });
      }
  };

  const toggleStatus = (userId: string, status: 'present' | 'absent') => {
      if (!currentSession) return;
      
      // Permission: Only Admin/Super Admin can edit
      if (currentUser.role === UserRole.MEMBER) return;
      // Permission: If submitted, only Super Admin can edit
      if (currentSession.submitted && currentUser.role !== UserRole.SUPER_ADMIN) return;

      const updatedEntries = currentSession.entries.map(e => 
          e.userId === userId ? { ...e, status } : e
      );
      setCurrentSession({ ...currentSession, entries: updatedEntries });
  };

  const handleSave = async (submit: boolean = false) => {
      if (!currentSession) return;
      
      const toSave = {
          ...currentSession,
          markedBy: currentUser.id,
          submitted: submit ? true : currentSession.submitted // Once submitted, stays submitted unless super admin changes logic
      };

      await storageService.saveAttendanceSession(toSave);
      await loadData(); // Reload
      if (submit) setSelectedDate(null); // Close on submit
      else alert("Draft saved");
  };

  const canEdit = () => {
      if (!currentSession) return false;
      if (currentUser.role === UserRole.MEMBER) return false;
      if (currentSession.submitted && currentUser.role !== UserRole.SUPER_ADMIN) return false;
      return true;
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left: Calendar & Badges */}
        <div className="w-full md:w-1/3 space-y-6">
            {/* Calendar Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">{monthName} {year}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft /></button>
                        <button onClick={() => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronRight /></button>
                    </div>
                </div>
                
                <div className="grid grid-cols-7 gap-2 text-center mb-2">
                    {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-xs font-bold text-gray-400">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {Array(firstDayOfMonth).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array(daysInMonth).fill(null).map((_, i) => {
                        const day = i + 1;
                        const dateStr = formatDate(new Date(year, currentDate.getMonth(), day));
                        const session = sessions.find(s => s.date === dateStr);
                        const isToday = dateStr === formatDate(new Date());
                        
                        return (
                            <button 
                                key={day}
                                onClick={() => handleDateClick(day)}
                                className={`
                                    h-10 w-10 rounded-full flex items-center justify-center text-sm transition relative
                                    ${selectedDate === dateStr ? 'bg-primary text-white shadow-md scale-110' : 'hover:bg-gray-100 text-gray-700'}
                                    ${isToday ? 'border border-primary font-bold' : ''}
                                    ${session ? 'font-bold' : ''}
                                `}
                            >
                                {day}
                                {session && (
                                    <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${session.submitted ? 'bg-green-500' : 'bg-orange-400'}`}></span>
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-4 flex gap-4 text-xs text-gray-500 justify-center">
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span> Draft</div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Submitted</div>
                </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Trophy className="text-yellow-500" size={20} /> Top Attendees
                </h3>
                <div className="space-y-4">
                    {badges.length > 0 ? badges.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <div className="relative">
                                <img src={item.user.avatar} className="w-10 h-10 rounded-full border border-gray-100" />
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                    <Medal size={14} className={
                                        item.badge.type === 'gold' ? 'text-yellow-500 fill-yellow-500' :
                                        item.badge.type === 'silver' ? 'text-gray-400 fill-gray-400' :
                                        'text-amber-700 fill-amber-700'
                                    } />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">{item.user.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{item.badge.label}</p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-sm text-gray-400 italic">No badges awarded yet this month.</p>
                    )}
                </div>
            </div>
        </div>

        {/* Right: Attendance Roster */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
            {selectedDate ? (
                currentSession ? (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </h2>
                                <p className="text-gray-500 text-sm mt-1">
                                    Status: {currentSession.submitted ? <span className="text-green-600 font-bold flex items-center gap-1 inline-flex"><Lock size={12}/> Locked</span> : <span className="text-orange-500 font-bold">Draft Mode</span>}
                                </p>
                            </div>
                            {canEdit() && (
                                <div className="flex gap-2">
                                    {!currentSession.submitted && (
                                        <button onClick={() => handleSave(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">
                                            Save Draft
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleSave(true)} 
                                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 shadow-lg"
                                    >
                                        <Save size={16} /> {currentSession.submitted ? 'Update' : 'Submit'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                            <div className="grid grid-cols-12 bg-gray-100 p-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                <div className="col-span-6">Member</div>
                                <div className="col-span-6 text-center">Attendance</div>
                            </div>
                            <div className="divide-y divide-gray-200">
                                {currentSession.entries.map(entry => {
                                    const user = authorizedUsers.find(u => u.id === entry.userId);
                                    if (!user) return null;
                                    
                                    return (
                                        <div key={entry.userId} className="grid grid-cols-12 p-3 items-center hover:bg-white transition">
                                            <div className="col-span-6 flex items-center gap-3">
                                                <img src={user.avatar} className="w-8 h-8 rounded-full bg-white border" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                                    <p className="text-xs text-gray-400">{user.role}</p>
                                                </div>
                                            </div>
                                            <div className="col-span-6 flex justify-center gap-2">
                                                <button
                                                    disabled={!canEdit()}
                                                    onClick={() => toggleStatus(entry.userId, 'present')}
                                                    className={`w-10 h-10 rounded-lg font-bold text-sm transition flex items-center justify-center ${entry.status === 'present' ? 'bg-green-500 text-white shadow-md' : 'bg-gray-200 text-gray-400 hover:bg-gray-300'}`}
                                                >
                                                    P
                                                </button>
                                                <button
                                                    disabled={!canEdit()}
                                                    onClick={() => toggleStatus(entry.userId, 'absent')}
                                                    className={`w-10 h-10 rounded-lg font-bold text-sm transition flex items-center justify-center ${entry.status === 'absent' ? 'bg-red-500 text-white shadow-md' : 'bg-gray-200 text-gray-400 hover:bg-gray-300'}`}
                                                >
                                                    A
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        {!canEdit() && (
                            <div className="mt-4 p-4 bg-blue-50 text-blue-800 text-sm rounded-lg flex items-center gap-2">
                                <Lock size={16} /> Attendance is managed by Admins.
                            </div>
                        )}
                    </div>
                ) : null
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <div className="bg-gray-50 p-6 rounded-full mb-4">
                        <CalendarIcon size={48} className="text-primary/30" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-600">Select a Date</h3>
                    <p className="text-sm max-w-xs text-center mt-2">Click on any date in the calendar to view or mark attendance for the Sunday Village Visit.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
