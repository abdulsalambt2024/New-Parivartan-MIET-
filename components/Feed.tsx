
import React, { useState, useEffect } from 'react';
import { Post, User, UserRole, Comment } from '../types';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { Heart, MessageCircle, Share2, Image as ImageIcon, X, Trash2, Edit2, Save, MoreVertical, Send, Loader2, AlertCircle } from 'lucide-react';

interface FeedProps {
  currentUser: User | null;
  onLoginRequest: () => void;
}

export const Feed: React.FC<FeedProps> = ({ currentUser, onLoginRequest }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<Post['type']>('general');
  const [loading, setLoading] = useState(true);
  
  // Image Upload
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Editing
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Comments
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const loadPosts = async () => {
      setLoading(true);
      const p = await storageService.getPosts();
      setPosts(p);
      setLoading(false);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          Array.from(e.target.files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    setSelectedImages(prev => [...prev, reader.result as string]);
                }
            };
            reader.readAsDataURL(file);
          });
      }
  };

  const removeImage = (index: number) => {
      setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateClick = () => {
      if (!currentUser) {
          onLoginRequest();
          return;
      }
      if (currentUser.role === UserRole.USER) {
          alert("Posting is restricted to authorized Members, Admins, and Super Admins.");
          return;
      }
      setIsCreating(true);
  }

  const handleCreatePost = async () => {
    if (!currentUser) return;
    if (!newPostContent.trim() && selectedImages.length === 0) return;
    
    const newPost: Partial<Post> = {
      userId: currentUser.id,
      type: newPostType,
      content: newPostContent,
      images: selectedImages,
    };

    await storageService.savePost(newPost);
    await loadPosts();
    setIsCreating(false);
    setNewPostContent('');
    setSelectedImages([]);
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) {
        onLoginRequest();
        return;
    }
    // Optimistic UI update
    const updatedPosts = posts.map(p => {
      if (p.id === postId) return { ...p, likes: p.likes + 1 };
      return p;
    });
    setPosts(updatedPosts);
    
    const post = posts.find(p => p.id === postId);
    if (post) {
        const updatedPost = { ...post, likes: post.likes + 1 };
        await storageService.updatePost(updatedPost);
    }
  };

  const handleDelete = async (postId: string) => {
      if (window.confirm("Are you sure you want to delete this post?")) {
          await storageService.deletePost(postId);
          await loadPosts();
      }
  };

  const startEdit = (post: Post) => {
      setEditingPostId(post.id);
      setEditContent(post.content);
  };

  const saveEdit = async (postId: string) => {
      const post = posts.find(p => p.id === postId);
      if (post) {
          const updated = { ...post, content: editContent };
          await storageService.updatePost(updated);
          await loadPosts();
          setEditingPostId(null);
      }
  };

  const canManagePost = (post: Post) => {
      if (!currentUser) return false;
      if (currentUser.role === UserRole.USER) return false;
      if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN) return true;
      return post.userId === currentUser.id;
  };

  const handleAddComment = async (postId: string) => {
      if (!currentUser || !commentText.trim()) return;
      setCommentLoading(true);

      const validation = await geminiService.validateContent(commentText);
      if (!validation.isSafe) {
          alert(`Comment rejected: ${validation.reason}`);
          setCommentLoading(false);
          return;
      }

      await storageService.addComment(postId, {
          userId: currentUser.id,
          content: commentText
      });

      await loadPosts();
      setCommentText('');
      setCommentLoading(false);
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
      if (window.confirm("Delete this comment?")) {
          await storageService.deleteComment(postId, commentId);
          await loadPosts();
      }
  };

  const canDeleteComment = (post: Post, comment: Comment) => {
      if (!currentUser) return false;
      if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN) return true;
      if (post.userId === currentUser.id) return true;
      if (comment.userId === currentUser.id) return true;
      return false;
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary"/></div>;

  return (
    <div className="max-w-2xl mx-auto py-4 px-4">
       <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
         <div className="flex items-center gap-3 cursor-pointer" onClick={handleCreateClick}>
             <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0">
                <img src={currentUser?.avatar || 'https://ui-avatars.com/api/?name=Guest'} alt="Me" className="w-full h-full object-cover" />
             </div>
             <div className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-gray-500 hover:bg-gray-100 transition text-sm">
                 {currentUser ? `Share something, ${currentUser.name.split(' ')[0]}...` : 'Sign in to share...'}
             </div>
             <button className="bg-primary/10 text-primary p-2 rounded-full hover:bg-primary/20">
                <ImageIcon size={20} />
             </button>
         </div>
       </div>

       {isCreating && currentUser && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <h3 className="font-semibold text-gray-800">Create New Post</h3>
               <button onClick={() => setIsCreating(false)} className="text-gray-500 hover:text-gray-800"><X size={20} /></button>
             </div>
             <div className="p-4">
               <div className="flex gap-2 mb-4">
                 {['general', 'achievement', 'announcement'].map((t) => (
                   <button 
                     key={t}
                     onClick={() => setNewPostType(t as Post['type'])}
                     className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${newPostType === t ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                   >
                     {t}
                   </button>
                 ))}
               </div>
               <textarea
                 value={newPostContent}
                 onChange={(e) => setNewPostContent(e.target.value)}
                 placeholder="What's on your mind?"
                 className="w-full h-32 resize-none outline-none text-gray-700 text-lg placeholder-gray-400"
               />
               
               {selectedImages.length > 0 ? (
                   <div className="mt-2 grid grid-cols-2 gap-2">
                       {selectedImages.map((img, idx) => (
                           <div key={idx} className="relative group">
                               <img src={img} alt={`Upload ${idx}`} className="w-full h-32 object-cover rounded-lg" />
                               <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"><X size={12}/></button>
                           </div>
                       ))}
                   </div>
               ) : null}
               
               <div className="mt-2">
                   <label className="h-12 w-full border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center gap-2 text-gray-400 hover:bg-gray-50 hover:border-primary hover:text-primary cursor-pointer transition">
                        <ImageIcon size={20} />
                        <span className="text-sm font-medium">Add Photos</span>
                        <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                   </label>
               </div>
             </div>
             <div className="p-4 border-t border-gray-100 flex justify-end">
               <button onClick={handleCreatePost} className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-md">Post</button>
             </div>
           </div>
         </div>
       )}

       <div className="space-y-6">
         {posts.map(post => (
           <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300 group/post">
             <div className="p-4 flex items-center gap-3 justify-between">
               <div className="flex items-center gap-3">
                    <img src={post.userAvatar} alt={post.userName} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                    <div>
                        <h4 className="font-semibold text-gray-900 text-sm">{post.userName}</h4>
                        <span className="text-xs text-gray-500">{new Date(post.timestamp).toLocaleDateString()}</span>
                    </div>
               </div>
               {canManagePost(post) && (
                   <div className="flex items-center gap-2 opacity-0 group-hover/post:opacity-100 transition-opacity">
                       {editingPostId === post.id ? (
                           <button onClick={() => saveEdit(post.id)} className="p-2 bg-green-50 text-green-600 rounded-full"><Save size={16} /></button>
                       ) : (
                           <button onClick={() => startEdit(post)} className="p-2 bg-gray-50 text-gray-600 rounded-full"><Edit2 size={16} /></button>
                       )}
                       <button onClick={() => handleDelete(post.id)} className="p-2 bg-red-50 text-red-600 rounded-full"><Trash2 size={16} /></button>
                   </div>
               )}
             </div>
             
             <div className="px-4 pb-3">
                {editingPostId === post.id ? (
                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full border rounded p-2" rows={3} />
                ) : (
                    <p className="text-gray-800 whitespace-pre-line">{post.content}</p>
                )}
             </div>

             {post.images && post.images.length > 0 && (
                 <div className={`w-full bg-gray-100 grid gap-1 ${post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {post.images.map((img, idx) => (
                        <img key={idx} src={img} className="w-full h-auto max-h-[400px] object-cover" />
                    ))}
                 </div>
             )}

             <div className="p-3 flex items-center gap-6 border-t border-gray-50 mt-1">
               <button onClick={() => handleLike(post.id)} className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition">
                 <Heart size={20} className={post.likes > 0 ? 'text-red-500 fill-red-500' : ''} />
                 <span className="font-medium text-sm">{post.likes}</span>
               </button>
               <button onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)} className="flex items-center gap-2 text-gray-500 hover:text-primary transition">
                 <MessageCircle size={20} />
                 <span className="font-medium text-sm">{post.comments.length}</span>
               </button>
             </div>

             {activeCommentPostId === post.id && (
                 <div className="bg-gray-50 p-4 border-t border-gray-100">
                     <div className="space-y-3 mb-4">
                         {post.comments.map(comment => (
                             <div key={comment.id} className="flex gap-3 group/comment">
                                 <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-xs font-bold text-primary shrink-0">{comment.userName.charAt(0)}</div>
                                 <div className="flex-1">
                                     <div className="bg-white p-3 rounded-2xl relative">
                                        <span className="text-xs font-bold text-gray-900 block mb-1">{comment.userName}</span>
                                        <p className="text-sm text-gray-700">{comment.content}</p>
                                        {canDeleteComment(post, comment) && (
                                            <button onClick={() => handleDeleteComment(post.id, comment.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover/comment:opacity-100"><X size={14} /></button>
                                        )}
                                     </div>
                                 </div>
                             </div>
                         ))}
                     </div>
                     <div className="flex items-center gap-2 relative">
                         {currentUser ? (
                             <>
                                 <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment..." className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm" disabled={commentLoading} onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)} />
                                 <button onClick={() => handleAddComment(post.id)} disabled={!commentText.trim() || commentLoading} className="bg-primary text-white p-2 rounded-full hover:bg-blue-700 transition">{commentLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
                             </>
                         ) : (
                             <div className="text-center w-full text-sm text-gray-500 cursor-pointer" onClick={onLoginRequest}>Log in to comment</div>
                         )}
                     </div>
                 </div>
             )}
           </div>
         ))}
       </div>
    </div>
  );
};
