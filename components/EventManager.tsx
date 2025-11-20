
import React, { useState, useEffect } from 'react';
import { Calendar, CheckSquare, Heart, Plus, Lock, UserPlus, Loader2 } from 'lucide-react';
import { storageService } from '../services/storageService';
import { User, UserRole, Event } from '../types';

interface EventManagerProps {
    currentUser: User | null;
    defaultTab?: 'events' | 'tasks' | 'donate';
}

export const EventManager: React.FC<EventManagerProps> = ({ currentUser, defaultTab = 'events' }) => {
  const [activeTab, setActiveTab] = useState<'events' | 'tasks' | 'donate'>(defaultTab);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Strictly authorized: Members, Admins, Super Admins
  const isAuthorized = currentUser && currentUser.role !== UserRole.USER;

  useEffect(() => {
      const fetchEvents = async () => {
        setLoading(true);
        const evts = await storageService.getEvents();
        setEvents(evts);
        setLoading(false);
      };
      fetchEvents();
  }, []);

  useEffect(() => {
      if (defaultTab === 'tasks' && !isAuthorized) {
          setActiveTab('events');
      } else {
          setActiveTab(defaultTab);
      }
  }, [defaultTab, isAuthorized]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
       <div className="flex flex-wrap gap-4 mb-8 justify-center">
         <button 
           onClick={() => setActiveTab('events')}
           className={`px-6 py-2 rounded-full flex items-center gap-2 transition ${activeTab === 'events' ? 'bg-primary text-white shadow-lg' : 'bg-white text-gray-600 shadow-sm'}`}
         >
           <Calendar size={18} /> Events
         </button>
         
         {/* HIDE TASKS TAB FOR UNAUTHORIZED USERS */}
         {isAuthorized && (
            <button 
            onClick={() => setActiveTab('tasks')}
            className={`px-6 py-2 rounded-full flex items-center gap-2 transition ${activeTab === 'tasks' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-600 shadow-sm'}`}
            >
            <CheckSquare size={18} /> Tasks
            </button>
         )}

         <button 
           onClick={() => setActiveTab('donate')}
           className={`px-6 py-2 rounded-full flex items-center gap-2 transition ${activeTab === 'donate' ? 'bg-pink-500 text-white shadow-lg' : 'bg-white text-gray-600 shadow-sm'}`}
         >
           <Heart size={18} /> Donate
         </button>
       </div>

       {activeTab === 'events' && (
         loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary"/></div> :
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {events.map(event => (
              <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group">
                <div className="h-40 bg-gray-200 relative overflow-hidden">
                  <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                    {event.date}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                  <p className="text-gray-500 text-sm mb-4">{event.description}</p>
                  <div className="flex items-center text-xs text-gray-400 mb-4">
                    <span className="uppercase font-semibold">{event.location}</span>
                  </div>
                  <button className="w-full py-2 bg-primary/10 text-primary rounded-lg font-semibold hover:bg-primary hover:text-white transition">
                    RSVP Now
                  </button>
                </div>
              </div>
            ))}
            
            {/* Only Show Create Event if Authorized */}
            {isAuthorized && (
                <button className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-6 text-gray-400 hover:bg-white hover:border-primary hover:text-primary transition cursor-pointer h-full min-h-[300px]">
                   <Plus size={48} className="mb-2" />
                   <span className="font-medium">Create New Event</span>
                   <span className="text-xs mt-2">Member Access Only</span>
                </button>
            )}
         </div>
       )}

       {activeTab === 'tasks' && isAuthorized && (
         <div className="bg-white rounded-2xl shadow-md overflow-hidden animate-fade-in">
           <div className="p-6 border-b border-gray-100 flex justify-between items-center">
             <h3 className="text-lg font-bold text-gray-800">Community Tasks</h3>
             <button className="flex items-center gap-1 text-sm text-primary font-bold hover:underline">
                 <Plus size={16} /> Assign Task
             </button>
           </div>
           
           <div className="divide-y divide-gray-100">
             {[1, 2, 3].map(i => (
               <div key={i} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                 <div className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-red-500' : i === 2 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                 <div className="flex-1">
                   <h4 className="text-sm font-semibold text-gray-900">Update Community Guidelines</h4>
                   <p className="text-xs text-gray-500">Assigned to: Admin User</p>
                 </div>
                 <span className="text-xs bg-gray-100 px-2 py-1 rounded">Due Tomorrow</span>
               </div>
             ))}
           </div>
         </div>
       )}

       {activeTab === 'donate' && (
         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center animate-fade-in">
             <Heart size={48} className="mx-auto text-pink-500 mb-4" />
             <h3 className="text-2xl font-bold text-gray-900 mb-2">Support Our Cause</h3>
             <p className="text-gray-500 max-w-md mx-auto mb-6">
                 Your contributions help us organize village visits, educational programs, and community events.
             </p>
             {/* Donation Campaign Management for Authorized Users ONLY */}
             {isAuthorized && (
                 <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100 inline-block">
                     <p className="text-sm text-blue-800 font-semibold mb-2">Campaign Management</p>
                     <button className="px-4 py-2 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Edit Details</button>
                 </div>
             )}
             <br/>
             <button className="bg-pink-500 text-white px-8 py-3 rounded-full font-bold hover:bg-pink-600 transition shadow-lg">
                 Donate Now
             </button>
         </div>
       )}
    </div>
  );
};
