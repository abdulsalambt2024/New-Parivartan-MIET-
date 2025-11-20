
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, User, UserRole } from '../types';
import { Search, MoreVertical, Send, Smile, ShieldCheck, Users as UsersIcon, Image as ImageIcon, X } from 'lucide-react';
import { storageService } from '../services/storageService';

interface ChatProps {
  currentUser: User;
}

export const ChatInterface: React.FC<ChatProps> = ({ currentUser }) => {
  const [activeChatId, setActiveChatId] = useState<string | null>('group-parivartan');
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatImage, setSelectedChatImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      // Load all users excluding self
      const loadUsers = async () => {
        const all = await storageService.getAllUsers();
        const filtered = all.filter(u => u.id !== currentUser.id && u.role !== UserRole.USER);
        setUsers(filtered);
      };
      loadUsers();
  }, [currentUser.id]);

  useEffect(() => {
      if (activeChatId) {
          const loadMessages = async () => {
            const msgs = await storageService.getChatMessages(activeChatId);
            setMessages(msgs);
          };
          loadMessages();
      }
  }, [activeChatId]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = () => {
            setSelectedChatImage(reader.result as string);
        };
        reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedChatImage) || !activeChatId) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: inputText,
      image: selectedChatImage || undefined,
      timestamp: Date.now(),
    };

    const updatedMsgs = await storageService.saveChatMessage(activeChatId, newMessage);
    setMessages(updatedMsgs);
    setInputText('');
    setSelectedChatImage(null);
  };

  const getChatId = (otherUserId: string) => {
      // Create consistent ID for DM
      const ids = [currentUser.id, otherUserId].sort();
      return `dm_${ids[0]}_${ids[1]}`;
  };

  // Filter users for search
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Determine info about active chat
  let activeChatName = 'Parivartan Group';
  let activeChatAvatar = null;
  let activeChatVerified = false;

  if (activeChatId === 'group-parivartan') {
      activeChatName = 'Parivartan Group';
  } else if (activeChatId) {
      const otherUserId = activeChatId.split('_').find(id => id !== 'dm' && id !== currentUser.id);
      const u = users.find(user => user.id === otherUserId);
      if (u) {
          activeChatName = u.name;
          activeChatAvatar = u.avatar;
          activeChatVerified = u.role === UserRole.SUPER_ADMIN || u.role === UserRole.ADMIN;
      }
  }

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white rounded-2xl overflow-hidden shadow-xl mx-4 my-4 border border-gray-200">
      {/* Sidebar */}
      <div className={`w-full md:w-80 bg-gray-50 border-r border-gray-200 flex flex-col ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-center">
          <img src={currentUser.avatar} alt="Me" className="w-10 h-10 rounded-full border" />
          <div className="flex gap-3 text-gray-500">
             <button><MoreVertical size={20} /></button>
          </div>
        </div>
        
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search authorized members" 
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Parivartan Group */}
          {!searchQuery && (
              <div 
                onClick={() => setActiveChatId('group-parivartan')}
                className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-white transition border-b border-gray-100/50 ${activeChatId === 'group-parivartan' ? 'bg-white shadow-sm border-l-4 border-l-primary' : ''}`}
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 text-primary flex items-center justify-center">
                    <UsersIcon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900">Parivartan Group</h4>
                  <p className="text-xs text-gray-500">Official group for all members</p>
                </div>
              </div>
          )}

          <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase">Members</div>
          
          {filteredUsers.map(user => (
            <div 
              key={user.id}
              onClick={() => setActiveChatId(getChatId(user.id))}
              className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-white transition border-b border-gray-100/50 ${activeChatId === getChatId(user.id) ? 'bg-white shadow-sm border-l-4 border-l-primary' : ''}`}
            >
              <div className="relative">
                 <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                 {(user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) && (
                     <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-0.5 rounded-full border-2 border-white"><ShieldCheck size={10} /></div>
                 )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h4 className="font-medium text-gray-900 truncate">{user.name}</h4>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">{user.role}</span>
                </div>
                <p className="text-xs text-gray-400">Tap to chat</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-[#e5ddd5] bg-opacity-30 ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
        {activeChatId ? (
          <>
            {/* Header */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center px-4 justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveChatId(null)} className="md:hidden text-gray-500 mr-1">
                    <Search size={20} className="rotate-90" />
                </button>
                {activeChatAvatar ? (
                    <img src={activeChatAvatar} className="w-10 h-10 rounded-full" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-primary flex items-center justify-center"><UsersIcon size={20} /></div>
                )}
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center gap-1">
                    {activeChatName}
                    {activeChatVerified && <ShieldCheck size={14} className="text-green-500" />}
                  </h4>
                  <p className="text-xs text-gray-500">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-primary">
                <MoreVertical className="cursor-pointer hover:bg-indigo-50 p-2 rounded-full w-9 h-9 text-gray-500" />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-contain opacity-90">
              {messages.map(msg => {
                  const isMe = msg.senderId === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && activeChatId === 'group-parivartan' && <span className="text-[10px] text-gray-500 ml-1 mb-0.5">{msg.senderName}</span>}
                      <div className={`max-w-[70%] px-4 py-2 rounded-lg shadow-sm ${isMe ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'}`}>
                        {msg.image && (
                            <div className="mb-2 rounded-lg overflow-hidden border border-gray-100/50">
                                <img src={msg.image} alt="Shared" className="max-w-full h-auto max-h-64 object-cover" />
                            </div>
                        )}
                        {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                        <p className="text-[10px] text-gray-500 text-right mt-1 block opacity-70">
                          {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                  );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-gray-50 border-t border-gray-200">
                {/* Image Preview */}
                {selectedChatImage && (
                    <div className="px-4 pt-3 pb-1 flex">
                        <div className="relative group">
                            <img src={selectedChatImage} alt="Preview" className="h-20 w-auto rounded-lg border border-gray-300 shadow-sm" />
                            <button 
                                onClick={() => setSelectedChatImage(null)} 
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition"
                            >
                                <X size={12}/>
                            </button>
                        </div>
                    </div>
                )}
                
                <form onSubmit={handleSend} className="p-3 flex items-center gap-2">
                    <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition"
                        title="Attach Image"
                    >
                        <ImageIcon size={20} />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageSelect}
                    />
                    
                    <Smile className="text-gray-500 cursor-pointer p-2 w-9 h-9 hover:bg-gray-200 rounded-full transition" />
                    
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type a message"
                        className="flex-1 py-2.5 px-4 rounded-full border border-gray-200 focus:outline-none focus:border-primary bg-white"
                    />
                    <button 
                        type="submit" 
                        disabled={!inputText.trim() && !selectedChatImage}
                        className="p-2.5 bg-primary text-white rounded-full hover:bg-indigo-600 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 flex-col text-gray-400">
             <div className="w-32 h-32 bg-gray-200 rounded-full mb-4 animate-pulse"></div>
             <p>Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};
