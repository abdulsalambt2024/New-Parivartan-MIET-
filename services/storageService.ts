
import { User, UserRole, Post, Event, Slide, AttendanceSession, StartupConfig, ChatMessage, Comment, Notification, Feedback, Suggestion, Task, DonationCampaign } from '../types';
import * as OTPAuth from 'otpauth';
import { supabase } from './supabaseClient';

// Helper to map Supabase data to App Types
const mapProfileToUser = (p: any): User => ({
    id: p.id,
    name: p.name || p.email?.split('@')[0] || 'User',
    email: p.email,
    role: p.role as UserRole,
    avatar: p.avatar,
    verified: p.verified,
    bio: p.bio,
    location: p.location,
    social: p.social || {},
    twoFactorEnabled: p.two_factor_enabled ?? p.twoFactorEnabled, // Handle both DB (snake) and local (camel) keys
    twoFactorSecret: p.two_factor_secret ?? p.twoFactorSecret,
    notificationPreferences: p.notification_preferences || p.notificationPreferences || { likes: true, comments: true, mentions: true, system: true },
    badges: p.badges // Note: Badges logic needs separate implementation in DB or computed
});

const INITIAL_SLIDES: Slide[] = [
  {
    id: '1',
    image: 'https://picsum.photos/1200/600?random=1',
    title: 'Welcome to PARIVARTAN',
    description: 'Driving change in our community through innovation and unity.',
  },
  {
    id: '2',
    image: 'https://picsum.photos/1200/600?random=2',
    title: 'Community Impact',
    description: 'Join us to make a real difference on the ground.',
  }
];

const SUPER_ADMIN_EMAILS = ['abdul.salam.bt.2024@miet.ac.in', 'hayatamr9608@gmail.com'];
const SESSION_KEY = 'parivartan_user';

export const storageService = {
  // --- AUTH & USER (Synchronous for UI Session) ---
  getUser: (): User | null => {
      const u = localStorage.getItem(SESSION_KEY);
      return u ? JSON.parse(u) : null;
  },

  setUser: (user: User) => {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  clearUser: () => {
      localStorage.removeItem(SESSION_KEY);
  },

  // Modified Authenticate to Sync with Supabase
  authenticate: async (email: string): Promise<{ user: User, isNew: boolean }> => {
      const id = email.replace(/[@.]/g, '_');
      const isSuper = SUPER_ADMIN_EMAILS.includes(email);
      
      let profile = null;
      let isNew = false;

      try {
          // Try to fetch user from Supabase
          const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
          
          if (!error && data) {
              profile = data;
          }
      } catch (e) {
          console.warn("Supabase fetch error (possibly offline):", e);
      }

      if (!profile) {
          isNew = true;
          const newUser = {
              id,
              email,
              name: email.split('@')[0],
              role: isSuper ? UserRole.SUPER_ADMIN : UserRole.MEMBER,
              avatar: `https://ui-avatars.com/api/?name=${email}&background=random`,
              verified: false,
              social: {},
              notification_preferences: { likes: true, comments: true, mentions: true, system: true }
          };
          
          try {
            // Upsert to Supabase to ensure ID exists for FKs
            const { error } = await supabase.from('profiles').upsert(newUser);
            
            if (error) {
                console.error("Error creating profile in DB:", JSON.stringify(error));
                // If RLS blocks insert, we still proceed with local session so user isn't blocked.
            }
            
            // Use newUser as profile
            profile = newUser;
          } catch (e) {
            console.error("Supabase upsert exception:", e);
            profile = newUser;
          }
      }

      const user = mapProfileToUser(profile);
      
      return { user, isNew };
  },

  // --- SUPABASE USER OPERATIONS ---
  getAllUsers: async (): Promise<User[]> => {
    const { data } = await supabase.from('profiles').select('*');
    return (data || []).map(mapProfileToUser);
  },

  updateUserRole: async (userId: string, newRole: UserRole) => {
      await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
  },

  updateProfile: async (userId: string, updates: Partial<User>) => {
      const dbUpdates: any = {};
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.social !== undefined) dbUpdates.social = updates.social;
      if (updates.twoFactorEnabled !== undefined) dbUpdates.two_factor_enabled = updates.twoFactorEnabled;
      if (updates.twoFactorSecret !== undefined) dbUpdates.two_factor_secret = updates.twoFactorSecret;
      if (updates.notificationPreferences !== undefined) dbUpdates.notification_preferences = updates.notificationPreferences;

      const { data } = await supabase.from('profiles').update(dbUpdates).eq('id', userId).select().single();
      // Update local session if it matches
      const currentUser = storageService.getUser();
      if (currentUser && currentUser.id === userId && data) {
          storageService.setUser(mapProfileToUser(data));
      }
      return data ? mapProfileToUser(data) : null;
  },

  // --- POSTS ---
  getPosts: async (): Promise<Post[]> => {
    const { data: posts, error } = await supabase
        .from('posts')
        .select(`
            *,
            profiles (name, avatar),
            comments (
                id, user_id, content, created_at,
                profiles (name)
            )
        `)
        .order('created_at', { ascending: false });

    if (error || !posts) return [];

    return posts.map((p: any) => {
        let images: string[] = [];
        if (p.image) {
            try {
                const parsed = JSON.parse(p.image);
                if (Array.isArray(parsed)) images = parsed;
                else images = [p.image];
            } catch (e) {
                if (p.image) images = [p.image];
            }
        }

        return {
            id: p.id,
            userId: p.user_id,
            userName: p.profiles?.name || 'Unknown',
            userAvatar: p.profiles?.avatar || '',
            type: p.type,
            content: p.content,
            images: images, 
            image: images[0],
            likes: p.likes_count,
            timestamp: new Date(p.created_at).getTime(),
            comments: (p.comments || []).map((c: any) => ({
                id: c.id,
                userId: c.user_id,
                userName: c.profiles?.name || 'Unknown',
                content: c.content,
                timestamp: new Date(c.created_at).getTime()
            }))
        };
    });
  },
  
  savePost: async (post: Partial<Post>) => {
    const imagePayload = post.images && post.images.length > 0 
        ? JSON.stringify(post.images) 
        : (post.image ? post.image : null);

    await supabase.from('posts').insert({
        user_id: post.userId,
        type: post.type,
        content: post.content,
        image: imagePayload 
    });
  },

  deletePost: async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId);
  },

  updatePost: async (post: Post) => {
    await supabase.from('posts').update({ content: post.content, likes_count: post.likes }).eq('id', post.id);
  },

  addComment: async (postId: string, comment: Partial<Comment>) => {
    await supabase.from('comments').insert({
        post_id: postId,
        user_id: comment.userId,
        content: comment.content
    });
  },

  deleteComment: async (postId: string, commentId: string) => {
    await supabase.from('comments').delete().eq('id', commentId);
  },

  // --- EVENTS ---
  getEvents: async (): Promise<Event[]> => {
      const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
      return (data || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          description: e.description,
          location: e.location,
          image: e.image
      }));
  },
  
  saveEvent: async (event: Event) => {
      // If ID exists and not new, update, else insert. Simple check:
      const { data } = await supabase.from('events').select('id').eq('id', event.id || '').single();
      
      if (data) {
         await supabase.from('events').update({
            title: event.title,
            date: event.date,
            description: event.description,
            location: event.location,
            image: event.image,
         }).eq('id', event.id);
      } else {
         await supabase.from('events').insert({
            // Let Supabase gen ID if undefined, or use passed ID
            title: event.title,
            date: event.date,
            description: event.description,
            location: event.location,
            image: event.image,
         });
      }
  },

  updateEvent: async (event: Event) => {
      await supabase.from('events').update({
          title: event.title,
          date: event.date,
          description: event.description,
          location: event.location,
          image: event.image,
      }).eq('id', event.id);
  },

  deleteEvent: async (id: string) => {
      await supabase.from('events').delete().eq('id', id);
  },

  // --- TASKS ---
  getTasks: async (): Promise<Task[]> => {
      const { data } = await supabase.from('tasks').select('*, profiles(name)');
      return (data || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          assignedTo: t.assigned_to,
          assignedToName: t.profiles?.name,
          status: t.status,
          dueDate: t.due_date
      }));
  },
  
  saveTask: async (task: Task) => {
      const { data } = await supabase.from('tasks').select('id').eq('id', task.id).single();
      const payload = {
          id: task.id,
          title: task.title,
          description: task.description,
          assigned_to: task.assignedTo,
          status: task.status,
          due_date: task.dueDate
      };
      
      if (data) {
          await supabase.from('tasks').update(payload).eq('id', task.id);
      } else {
          await supabase.from('tasks').insert(payload);
      }
  },

  deleteTask: async (id: string) => {
      await supabase.from('tasks').delete().eq('id', id);
  },

  // --- CAMPAIGNS ---
  getCampaigns: async (): Promise<DonationCampaign[]> => {
      const { data } = await supabase.from('campaigns').select('*');
      return (data || []).map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          targetAmount: Number(c.target_amount),
          raisedAmount: Number(c.raised_amount),
          upiId: c.upi_id,
          image: c.image
      }));
  },

  saveCampaign: async (campaign: DonationCampaign) => {
      const { data } = await supabase.from('campaigns').select('id').eq('id', campaign.id).single();
      const payload = {
          id: campaign.id,
          title: campaign.title,
          description: campaign.description,
          target_amount: campaign.targetAmount,
          raised_amount: campaign.raisedAmount,
          upi_id: campaign.upiId,
          image: campaign.image
      };

      if (data) {
          await supabase.from('campaigns').update(payload).eq('id', campaign.id);
      } else {
          await supabase.from('campaigns').insert(payload);
      }
  },

  deleteCampaign: async (id: string) => {
      await supabase.from('campaigns').delete().eq('id', id);
  },

  // --- SLIDES ---
  getSlides: async (): Promise<Slide[]> => {
    const { data } = await supabase.from('slides').select('*').order('created_at', { ascending: true });
    if (!data || data.length === 0) return INITIAL_SLIDES;
    return data.map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        image: s.image
    }));
  },

  saveSlides: async (slides: Slide[]) => {
      // Full refresh logic: delete all and insert new (simple for carousel)
      // Or upsert. For simplicity, we'll just upsert each.
      for (const slide of slides) {
          const { data } = await supabase.from('slides').select('id').eq('id', slide.id).single();
          if (data) {
              await supabase.from('slides').update(slide).eq('id', slide.id);
          } else {
              await supabase.from('slides').insert(slide);
          }
      }
      // Handle deletions if needed (not implemented for simple upsert loop, but okay for demo)
  },

  // --- ATTENDANCE ---
  getAttendanceSessions: async (): Promise<AttendanceSession[]> => {
      const { data } = await supabase.from('attendance_sessions').select('*');
      return (data || []).map((s: any) => ({
          date: s.date,
          villageName: s.village_name,
          entries: s.entries,
          markedBy: s.marked_by,
          submitted: s.submitted
      }));
  },

  saveAttendanceSession: async (session: AttendanceSession) => {
      const { data } = await supabase.from('attendance_sessions').select('date').eq('date', session.date).single();
      
      if (data) {
          await supabase.from('attendance_sessions').update({
              entries: session.entries,
              submitted: session.submitted,
              marked_by: session.markedBy
          }).eq('date', session.date);
      } else {
          await supabase.from('attendance_sessions').insert({
              date: session.date,
              village_name: session.villageName,
              entries: session.entries,
              submitted: session.submitted,
              marked_by: session.markedBy
          });
      }
  },

  // --- NOTIFICATIONS ---
  getNotifications: async (userId: string): Promise<Notification[]> => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      return (data || []).map((n: any) => ({
          id: n.id,
          userId: n.user_id,
          type: n.type,
          content: n.content,
          read: n.read,
          timestamp: new Date(n.created_at).getTime()
      }));
  },

  addNotification: async (userId: string, notification: any) => {
      await supabase.from('notifications').insert({
          user_id: userId,
          type: notification.type,
          content: notification.content
      });
  },
  
  markNotificationsRead: async (userId: string) => {
      await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
  },

  // --- FEEDBACK ---
  saveFeedback: async (feedback: Feedback) => {
      await supabase.from('feedback').insert({
          user_id: feedback.userId === 'anonymous' ? null : feedback.userId,
          rating: feedback.rating,
          comment: feedback.comment
      });
  },

  saveSuggestion: async (suggestion: Suggestion) => {
      await supabase.from('suggestions').insert({
          user_id: suggestion.userId === 'anonymous' ? null : suggestion.userId,
          title: suggestion.title,
          description: suggestion.description,
          category: suggestion.category
      });
  },

  // --- CONFIG ---
  getStartupConfig: async (): Promise<StartupConfig> => {
      const { data } = await supabase.from('system_config').select('value').eq('key', 'startup_popup').single();
      if (data) return data.value;
      return { enabled: true, title: "Welcome to PARIVARTAN", message: "Together we can make a difference." };
  },
  
  saveStartupConfig: async (config: StartupConfig) => {
      const { data } = await supabase.from('system_config').select('key').eq('key', 'startup_popup').single();
      if (data) {
          await supabase.from('system_config').update({ value: config }).eq('key', 'startup_popup');
      } else {
          await supabase.from('system_config').insert({ key: 'startup_popup', value: config });
      }
  },

  // --- CHAT ---
  getChatMessages: async (chatId: string): Promise<ChatMessage[]> => {
      const { data } = await supabase.from('chat_messages')
        .select('*, profiles(name)')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      return (data || []).map((m: any) => ({
          id: m.id,
          senderId: m.sender_id,
          senderName: m.profiles?.name || 'Unknown',
          text: m.text,
          image: m.image,
          timestamp: new Date(m.created_at).getTime()
      }));
  },

  saveChatMessage: async (chatId: string, message: Partial<ChatMessage>) => {
      await supabase.from('chat_messages').insert({
          id: message.id,
          chat_id: chatId,
          sender_id: message.senderId,
          text: message.text,
          image: message.image
      });
      // Return updated list via fetch
      return storageService.getChatMessages(chatId);
  },

  // --- 2FA ---
  generate2FASecret: () => {
    const secret = new OTPAuth.Secret({ size: 20 });
    return secret.base32;
  },

  verify2FAToken: (secret: string, token: string): boolean => {
    if (!secret) return true;
    try {
        const totp = new OTPAuth.TOTP({
            issuer: 'PARIVARTAN',
            label: 'ParivartanUser',
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(secret)
        });
        const delta = totp.validate({ token, window: 1 });
        return delta !== null;
    } catch (e) { return false; }
  }
};
