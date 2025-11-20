
import React, { useState } from 'react';
import { MessageSquarePlus, Star, Send, Lightbulb } from 'lucide-react';
import { storageService } from '../services/storageService';
import { User } from '../types';

interface FeedbackPanelProps {
    user: User;
}

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'suggestion' | 'feedback'>('suggestion');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<'feature' | 'improvement' | 'bug'>('feature');
    
    const [rating, setRating] = useState(5);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const submitSuggestion = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return;

        storageService.saveSuggestion({
            id: Date.now().toString(),
            userId: user.id,
            title,
            description,
            category,
            timestamp: Date.now()
        });
        
        setSubmitted(true);
        setTitle('');
        setDescription('');
        setTimeout(() => setSubmitted(false), 3000);
    };

    const submitFeedback = (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackComment.trim()) return;

        storageService.saveFeedback({
            id: Date.now().toString(),
            userId: user.id,
            rating,
            comment: feedbackComment,
            timestamp: Date.now()
        });

        setSubmitted(true);
        setFeedbackComment('');
        setTimeout(() => setSubmitted(false), 3000);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-100">
                <button 
                    onClick={() => setActiveTab('suggestion')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-semibold transition ${activeTab === 'suggestion' ? 'bg-blue-50 text-primary border-b-2 border-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Lightbulb size={18} /> Suggestions
                </button>
                <button 
                    onClick={() => setActiveTab('feedback')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-semibold transition ${activeTab === 'feedback' ? 'bg-blue-50 text-primary border-b-2 border-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Star size={18} /> App Feedback
                </button>
            </div>

            <div className="p-6">
                {submitted ? (
                    <div className="text-center py-8 animate-fade-in">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Send size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Thank You!</h3>
                        <p className="text-gray-500">Your input helps us make Parivartan better.</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'suggestion' ? (
                            <form onSubmit={submitSuggestion} className="space-y-4 animate-fade-in">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Feature Title</label>
                                    <input 
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="e.g., Dark Mode Support"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select 
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value as any)}
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none"
                                    >
                                        <option value="feature">New Feature</option>
                                        <option value="improvement">Improvement</option>
                                        <option value="bug">Bug Report</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea 
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none h-32 resize-none"
                                        placeholder="Describe the feature or issue..."
                                        required
                                    />
                                </div>
                                <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-md">
                                    Submit Suggestion
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={submitFeedback} className="space-y-6 animate-fade-in">
                                <div className="text-center">
                                    <p className="text-sm text-gray-500 mb-3">How would you rate your experience?</p>
                                    <div className="flex justify-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button 
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                className={`p-1 transition transform hover:scale-110 ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                            >
                                                <Star size={32} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Feedback</label>
                                    <textarea 
                                        value={feedbackComment}
                                        onChange={(e) => setFeedbackComment(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none h-32 resize-none"
                                        placeholder="Tell us what you think..."
                                        required
                                    />
                                </div>
                                <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-md">
                                    Send Feedback
                                </button>
                            </form>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
