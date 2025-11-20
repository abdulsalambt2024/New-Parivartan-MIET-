
import React, { useState, useEffect } from 'react';
import { Calendar, CheckSquare, Heart, Plus, Lock, UserPlus, Loader2, Trash, Edit2, X, Save } from 'lucide-react';
import { storageService } from '../services/storageService';
import { User, UserRole, Event, Task, DonationCampaign } from '../types';
import * as QRCode from 'qrcode';

interface EventManagerProps {
    currentUser: User | null;
    defaultTab?: 'events' | 'tasks' | 'donate';
}

// Sub-component for Campaign to handle individual QR generation
const CampaignCard: React.FC<{ campaign: DonationCampaign, isAuthorized: boolean, openModal: (t: any, c: any) => void, handleDelete: (t: any, id: string) => void }> = ({ campaign, isAuthorized, openModal, handleDelete }) => {
    const [qrCode, setQrCode] = useState<string>('');
    const upiLink = `upi://pay?pa=${campaign.upiId}&pn=${encodeURIComponent(campaign.title)}&cu=INR`;

    useEffect(() => {
        // Generate QR Code for UPI
        QRCode.toDataURL(upiLink)
            .then(url => setQrCode(url))
            .catch(err => console.error(err));
    }, [campaign.upiId, campaign.title]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 flex flex-col md:flex-row gap-8 group relative">
            {campaign.image && (
                <img src={campaign.image} alt={campaign.title} className="w-full md:w-1/3 h-48 object-cover rounded-xl" />
            )}
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{campaign.title}</h3>
                    {isAuthorized && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal('campaign', campaign)} className="p-2 bg-gray-100 rounded-full hover:bg-blue-100 text-gray-600 hover:text-blue-600"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete('campaign', campaign.id)} className="p-2 bg-gray-100 rounded-full hover:bg-red-100 text-gray-600 hover:text-red-600"><Trash size={16} /></button>
                        </div>
                    )}
                </div>
                <p className="text-gray-600 mb-6">{campaign.description}</p>
                
                <div className="mb-6">
                    <div className="flex justify-between text-sm font-bold mb-2">
                        <span className="text-green-600">Raised: ₹{campaign.raisedAmount.toLocaleString()}</span>
                        <span className="text-gray-500">Goal: ₹{campaign.targetAmount.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-pink-500 to-pink-400 h-full rounded-full" 
                            style={{ width: `${Math.min((campaign.raisedAmount / campaign.targetAmount) * 100, 100)}%` }}
                        />
                    </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <a 
                        href={upiLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-pink-500 text-white px-8 py-3 rounded-full font-bold hover:bg-pink-600 transition shadow-lg w-full md:w-auto text-center block"
                    >
                        Donate Now via UPI
                    </a>
                    <div className="flex items-center gap-2">
                        {qrCode && <img src={qrCode} alt="UPI QR Code" className="w-20 h-20 border border-gray-200 rounded-lg" />}
                        <div className="text-xs text-gray-400">
                            <p>Scan to Pay</p>
                            <p>{campaign.upiId}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const EventManager: React.FC<EventManagerProps> = ({ currentUser, defaultTab = 'events' }) => {
  const [activeTab, setActiveTab] = useState<'events' | 'tasks' | 'donate'>(defaultTab);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Edit/Create State
  const [showModal, setShowModal] = useState(false);
  const [editType, setEditType] = useState<'event' | 'task' | 'campaign'>('event');
  const [editingItem, setEditingItem] = useState<any>(null); // Loose type for flexible form

  // Strictly authorized: Members, Admins, Super Admins
  const isAuthorized = currentUser && currentUser.role !== UserRole.USER;

  useEffect(() => {
      loadAllData();
  }, []);

  const loadAllData = async () => {
      setLoading(true);
      try {
        const [evts, usrs, tsks, cmps] = await Promise.all([
            storageService.getEvents(),
            storageService.getAllUsers(),
            storageService.getTasks(),
            storageService.getCampaigns()
        ]);
        setEvents(evts);
        setUsers(usrs);
        setTasks(tsks);
        setCampaigns(cmps);
      } catch (e) {
          console.error("Failed to load data", e);
      }
      setLoading(false);
  };

  useEffect(() => {
      if (defaultTab === 'tasks' && !isAuthorized) {
          setActiveTab('events');
      } else {
          setActiveTab(defaultTab);
      }
  }, [defaultTab, isAuthorized]);

  const handleDelete = async (type: 'event' | 'task' | 'campaign', id: string) => {
      if(!confirm("Are you sure you want to delete this item?")) return;
      
      setLoading(true);
      if(type === 'event') await storageService.deleteEvent(id);
      if(type === 'task') await storageService.deleteTask(id);
      if(type === 'campaign') await storageService.deleteCampaign(id);

      await loadAllData();
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      
      if (editType === 'event') {
          if(editingItem.id) await storageService.updateEvent(editingItem);
          else await storageService.saveEvent({ ...editingItem });
      } else if (editType === 'task') {
          await storageService.saveTask({ 
              ...editingItem, 
              id: editingItem.id || Date.now().toString(),
              status: editingItem.status || 'pending' 
          });
      } else if (editType === 'campaign') {
          await storageService.saveCampaign({
              ...editingItem,
              id: editingItem.id || Date.now().toString(),
              raisedAmount: editingItem.raisedAmount || 0
          });
      }
      setShowModal(false);
      setEditingItem(null);
      await loadAllData();
  };

  const openModal = (type: 'event' | 'task' | 'campaign', item?: any) => {
      setEditType(type);
      setEditingItem(item || {});
      setShowModal(true);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 relative">
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

       {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary"/></div> : (
           <>
               {activeTab === 'events' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {events.map(event => (
                      <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group relative">
                        <div className="h-40 bg-gray-200 relative overflow-hidden">
                          <img src={event.image || 'https://picsum.photos/400/200'} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                            {event.date}
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                          <p className="text-gray-500 text-sm mb-4 line-clamp-2">{event.description}</p>
                          <div className="flex items-center text-xs text-gray-400 mb-4">
                            <span className="uppercase font-semibold">{event.location}</span>
                          </div>
                          <button className="w-full py-2 bg-primary/10 text-primary rounded-lg font-semibold hover:bg-primary hover:text-white transition">
                            RSVP Now
                          </button>
                        </div>
                        {isAuthorized && (
                            <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openModal('event', event)} className="p-1.5 bg-white rounded-full text-gray-600 hover:text-blue-600 shadow"><Edit2 size={14}/></button>
                                <button onClick={() => handleDelete('event', event.id)} className="p-1.5 bg-white rounded-full text-gray-600 hover:text-red-600 shadow"><Trash size={14}/></button>
                            </div>
                        )}
                      </div>
                    ))}
                    
                    {isAuthorized && (
                        <button 
                            onClick={() => openModal('event')}
                            className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-6 text-gray-400 hover:bg-white hover:border-primary hover:text-primary transition cursor-pointer h-full min-h-[300px]"
                        >
                           <Plus size={48} className="mb-2" />
                           <span className="font-medium">Create New Event</span>
                        </button>
                    )}
                 </div>
               )}

               {activeTab === 'tasks' && isAuthorized && (
                 <div className="bg-white rounded-2xl shadow-md overflow-hidden animate-fade-in">
                   <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                     <h3 className="text-lg font-bold text-gray-800">Community Tasks</h3>
                     <button onClick={() => openModal('task')} className="flex items-center gap-1 text-sm text-primary font-bold hover:underline">
                         <Plus size={16} /> Assign Task
                     </button>
                   </div>
                   
                   <div className="divide-y divide-gray-100">
                     {tasks.map(task => {
                         const assignee = users.find(u => u.id === task.assignedTo);
                         return (
                           <div key={task.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 group">
                             <div className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-green-500' : task.status === 'in-progress' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                             <div className="flex-1">
                               <h4 className="text-sm font-semibold text-gray-900">{task.title}</h4>
                               <p className="text-xs text-gray-500">Assigned to: <span className="font-medium">{assignee?.name || 'Unknown'}</span> • Due: {task.dueDate}</p>
                             </div>
                             <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                                 <button onClick={() => openModal('task', task)} className="text-gray-400 hover:text-blue-600"><Edit2 size={16} /></button>
                                 <button onClick={() => handleDelete('task', task.id)} className="text-gray-400 hover:text-red-600"><Trash size={16} /></button>
                             </div>
                             <span className={`text-xs px-2 py-1 rounded capitalize ${task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                 {task.status}
                             </span>
                           </div>
                         );
                     })}
                     {tasks.length === 0 && <div className="p-8 text-center text-gray-400">No active tasks.</div>}
                   </div>
                 </div>
               )}

               {activeTab === 'donate' && (
                 <div className="space-y-6 animate-fade-in">
                     {isAuthorized && (
                         <div className="flex justify-end">
                             <button onClick={() => openModal('campaign')} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-md">
                                 <Plus size={16} /> Create Campaign
                             </button>
                         </div>
                     )}
                     
                     <div className="grid grid-cols-1 gap-6">
                         {campaigns.map(campaign => (
                             <CampaignCard 
                                key={campaign.id} 
                                campaign={campaign} 
                                isAuthorized={isAuthorized || false} 
                                openModal={openModal} 
                                handleDelete={handleDelete}
                             />
                         ))}
                         {campaigns.length === 0 && (
                             <div className="text-center p-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                 <Heart size={48} className="mx-auto text-gray-300 mb-4" />
                                 <h3 className="text-gray-500 font-medium">No active campaigns</h3>
                                 <p className="text-sm text-gray-400">Check back later or create one.</p>
                             </div>
                         )}
                     </div>
                 </div>
               )}
           </>
       )}

       {/* UNIVERSAL MODAL */}
       {showModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
                   <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                       <h3 className="font-bold text-gray-900 capitalize">
                           {editingItem.id ? 'Edit' : 'Create'} {editType}
                       </h3>
                       <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-800"><X size={20}/></button>
                   </div>
                   <form onSubmit={handleSave} className="p-6 space-y-4">
                       {editType === 'event' && (
                           <>
                               <input required placeholder="Event Title" className="w-full border p-2 rounded" value={editingItem.title || ''} onChange={e => setEditingItem({...editingItem, title: e.target.value})} />
                               <textarea required placeholder="Description" className="w-full border p-2 rounded" value={editingItem.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} />
                               <div className="grid grid-cols-2 gap-4">
                                   <input required type="date" className="w-full border p-2 rounded" value={editingItem.date || ''} onChange={e => setEditingItem({...editingItem, date: e.target.value})} />
                                   <input required placeholder="Location" className="w-full border p-2 rounded" value={editingItem.location || ''} onChange={e => setEditingItem({...editingItem, location: e.target.value})} />
                               </div>
                               <input placeholder="Image URL (Optional)" className="w-full border p-2 rounded" value={editingItem.image || ''} onChange={e => setEditingItem({...editingItem, image: e.target.value})} />
                           </>
                       )}
                       
                       {editType === 'task' && (
                           <>
                               <input required placeholder="Task Title" className="w-full border p-2 rounded" value={editingItem.title || ''} onChange={e => setEditingItem({...editingItem, title: e.target.value})} />
                               <div className="grid grid-cols-2 gap-4">
                                   <select required className="w-full border p-2 rounded" value={editingItem.assignedTo || ''} onChange={e => setEditingItem({...editingItem, assignedTo: e.target.value})}>
                                       <option value="">Assign To...</option>
                                       {users.filter(u => u.role !== UserRole.USER).map(u => (
                                           <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                       ))}
                                   </select>
                                   <input required type="date" className="w-full border p-2 rounded" value={editingItem.dueDate || ''} onChange={e => setEditingItem({...editingItem, dueDate: e.target.value})} />
                               </div>
                               <select className="w-full border p-2 rounded" value={editingItem.status || 'pending'} onChange={e => setEditingItem({...editingItem, status: e.target.value})}>
                                   <option value="pending">Pending</option>
                                   <option value="in-progress">In Progress</option>
                                   <option value="completed">Completed</option>
                               </select>
                           </>
                       )}

                       {editType === 'campaign' && (
                           <>
                               <input required placeholder="Campaign Title" className="w-full border p-2 rounded" value={editingItem.title || ''} onChange={e => setEditingItem({...editingItem, title: e.target.value})} />
                               <textarea required placeholder="Description" className="w-full border p-2 rounded" value={editingItem.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} />
                               <div className="grid grid-cols-2 gap-4">
                                   <input required type="number" placeholder="Target Amount" className="w-full border p-2 rounded" value={editingItem.targetAmount || ''} onChange={e => setEditingItem({...editingItem, targetAmount: Number(e.target.value)})} />
                                   <input required placeholder="UPI ID" className="w-full border p-2 rounded" value={editingItem.upiId || ''} onChange={e => setEditingItem({...editingItem, upiId: e.target.value})} />
                               </div>
                               <input placeholder="Image URL (Optional)" className="w-full border p-2 rounded" value={editingItem.image || ''} onChange={e => setEditingItem({...editingItem, image: e.target.value})} />
                           </>
                       )}
                       
                       <div className="pt-4 flex justify-end gap-2">
                           <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                           <button type="submit" className="px-6 py-2 bg-primary text-white rounded hover:bg-blue-700">Save</button>
                       </div>
                   </form>
               </div>
           </div>
       )}
    </div>
  );
};
