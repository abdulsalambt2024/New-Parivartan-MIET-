
import { User, UserRole, Post, Event, Slide, AttendanceSession, StartupConfig, ChatMessage, Comment, Notification, Feedback, Suggestion } from '../types';
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
    social: p.social,
    twoFactorEnabled: p.two_factor_enabled,
    twoFactorSecret: p.two_factor_secret,
    notificationPreferences: p.notification_preferences || { likes: true, comments: true, mentions: true, system: true },
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
  // --- AUTH & USER (Synchronous for UI Compatibility) ---
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

  authenticate: (email: string): { user: User, isNew: boolean } => {
      // Mock auth logic for UI components that use synchronous auth
      // Real auth should use supabase.auth.signInWithOtp etc.
      const isSuper = SUPER_ADMIN_EMAILS.includes(email);
      const user: User = {
          id: email.replace(/[@.]/g, '_'),
          email,
          name: email.split('@')[0],
          role: isSuper ? UserRole.SUPER_ADMIN : UserRole.MEMBER,
          avatar: `https://ui-avatars.com/api/?name=${email}&background=random`,
          verified: false,
          notificationPreferences: { likes: true, comments: true, mentions: true, system: true }
      };
      // Check if we can restore from session if matches? 
      // For now, return constructed user.
      return { user, isNew: true };
  },

  // --- SUPABASE AUTH (Async) ---
  getCurrentUser: async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    // Fallback if trigger hasn't run yet (rare but possible)
    if (!profile && user.email) {
        const isSuper = SUPER_ADMIN_EMAILS.includes(user.email);
        const { data: newProfile } = await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email.split('@')[0],
            role: isSuper ? 'SUPER_ADMIN' : 'USER',
            avatar: `https://ui-avatars.com/api/?name=${user.email}&background=random`
        }).select().single();
        profile = newProfile;
    }
        
    return profile ? mapProfileToUser(profile) : null;
  },

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
                // Try parsing as JSON array first
                const parsed = JSON.parse(p.image);
                if (Array.isArray(parsed)) images = parsed;
                else images = [p.image];
            } catch (e) {
                // If parse fails, assume it's a single string URL
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
            image: images[0], // Backwards compat for single image view
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
    // If array, stringify it. If string, use as is.
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
      await supabase.from('events').insert({
          title: event.title,
          date: event.date,
          description: event.description,
          location: event.location,
          image: event.image,
      });
  },

  // --- SLIDES ---
  getSlides: (): Slide[] => {
    try {
        const s = localStorage.getItem('parivartan_slides');
        return s ? JSON.parse(s) : INITIAL_SLIDES;
    } catch { return INITIAL_SLIDES; }
  },
  saveSlides: (slides: Slide[]) => localStorage.setItem('parivartan_slides', JSON.stringify(slides)),

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
          user_id: feedback.userId || null,
          rating: feedback.rating,
          comment: feedback.comment
      });
  },

  saveSuggestion: async (suggestion: Suggestion) => {
      await supabase.from('suggestions').insert({
          user_id: suggestion.userId || null,
          title: suggestion.title,
          description: suggestion.description,
          category: suggestion.category
      });
  },

  // --- CONFIG ---
  getStartupConfig: (): StartupConfig => {
      try {
          const c = localStorage.getItem('parivartan_startup_msg');
          return c ? JSON.parse(c) : { enabled: true, title: "Welcome to PARIVARTAN", message: "Together we can make a difference." };
      } catch { return { enabled: true, title: "Welcome to PARIVARTAN", message: "" }; }
  },
  saveStartupConfig: (config: StartupConfig) => localStorage.setItem('parivartan_startup_msg', JSON.stringify(config)),

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
