
import React, { useState, useEffect } from 'react';
import { Slide, UserRole } from '../types';
import { storageService } from '../services/storageService';
import { ChevronLeft, ChevronRight, Edit, Plus, Trash, Save, X } from 'lucide-react';

interface HeroCarouselProps {
  userRole: UserRole;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ userRole }) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editSlide, setEditSlide] = useState<Slide | null>(null);

  const canManage = userRole === UserRole.SUPER_ADMIN || userRole === UserRole.ADMIN;

  useEffect(() => {
    setSlides(storageService.getSlides());
  }, []);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);

  const handleSave = () => {
    if (!editSlide) return;
    let newSlides;
    if (slides.find(s => s.id === editSlide.id)) {
      newSlides = slides.map(s => s.id === editSlide.id ? editSlide : s);
    } else {
      newSlides = [...slides, editSlide];
    }
    setSlides(newSlides);
    storageService.saveSlides(newSlides);
    setEditSlide(null);
    setIsEditing(false);
  };

  const handleDelete = (id: string) => {
    const newSlides = slides.filter(s => s.id !== id);
    setSlides(newSlides);
    storageService.saveSlides(newSlides);
    if (currentIndex >= newSlides.length) setCurrentIndex(0);
  };

  const addNewSlide = () => {
    setEditSlide({
      id: Date.now().toString(),
      title: 'New Slide Title',
      description: 'Description goes here',
      image: 'https://picsum.photos/1200/600'
    });
    setIsEditing(true);
  };

  // If no slides and not an admin (who needs UI to add first slide), hide
  if (slides.length === 0 && !canManage) {
      return null;
  }
  
  // If admin but empty, show a placeholder to allow adding
  if (slides.length === 0 && canManage) {
      return (
          <div className="w-full h-40 bg-gray-100 flex flex-col items-center justify-center border-b border-gray-200">
              <p className="text-gray-500 mb-2">No slides configured.</p>
              <button onClick={addNewSlide} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full">
                  <Plus size={16} /> Add First Slide
              </button>
              {isEditing && editSlide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
                         {/* Simple Edit Form reused */}
                         <h3 className="text-xl font-bold text-gray-800 mb-4">Add Slide</h3>
                         <div className="space-y-4">
                            <input className="w-full border p-2 rounded" placeholder="Title" value={editSlide.title} onChange={e => setEditSlide({...editSlide, title: e.target.value})} />
                            <textarea className="w-full border p-2 rounded" placeholder="Desc" value={editSlide.description} onChange={e => setEditSlide({...editSlide, description: e.target.value})} />
                            <input className="w-full border p-2 rounded" placeholder="Image URL" value={editSlide.image} onChange={e => setEditSlide({...editSlide, image: e.target.value})} />
                            <div className="flex gap-2">
                                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-gray-200 rounded">Cancel</button>
                                <button onClick={handleSave} className="flex-1 py-2 bg-primary text-white rounded">Save</button>
                            </div>
                         </div>
                    </div>
                </div>
              )}
          </div>
      );
  }

  return (
    <div className="relative w-full h-[500px] group overflow-hidden bg-gray-900">
      {slides.length > 0 && (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-500 ease-in-out"
            style={{ backgroundImage: `url(${slides[currentIndex].image})` }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-40" />
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center text-center px-4">
            <div className="max-w-2xl animate-fade-in-up">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
                {slides[currentIndex].title}
              </h1>
              <p className="text-lg md:text-xl text-gray-200 mb-8 drop-shadow-md">
                {slides[currentIndex].description}
              </p>
              <div className="flex justify-center gap-4">
                <button className="px-8 py-3 bg-white text-gray-900 font-semibold rounded-full hover:bg-gray-100 transition shadow-lg">
                  Get Started
                </button>
                <button className="px-8 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white hover:text-gray-900 transition shadow-lg">
                  Learn More
                </button>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition">
            <ChevronLeft size={24} />
          </button>
          <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition">
            <ChevronRight size={24} />
          </button>
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-3 h-3 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-8' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Admin Controls */}
      {canManage && slides.length > 0 && (
        <div className="absolute top-4 right-4 flex space-x-2">
          <button onClick={addNewSlide} className="p-2 bg-primary text-white rounded-full shadow-lg hover:bg-indigo-600 transition" title="Add Slide">
            <Plus size={20} />
          </button>
          <button 
            onClick={() => { setEditSlide(slides[currentIndex]); setIsEditing(true); }}
            className="p-2 bg-white text-gray-900 rounded-full shadow-lg hover:bg-gray-100 transition"
            title="Edit Current"
          >
            <Edit size={20} />
          </button>
          <button 
            onClick={() => handleDelete(slides[currentIndex].id)}
            className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition"
            title="Delete Current"
          >
            <Trash size={20} />
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && editSlide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Edit Slide</h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  value={editSlide.title}
                  onChange={(e) => setEditSlide({...editSlide, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  value={editSlide.description}
                  onChange={(e) => setEditSlide({...editSlide, description: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  value={editSlide.image}
                  onChange={(e) => setEditSlide({...editSlide, image: e.target.value})}
                />
              </div>
              <button 
                onClick={handleSave}
                className="w-full bg-primary text-white py-2 rounded-lg hover:bg-indigo-600 transition flex items-center justify-center gap-2"
              >
                <Save size={18} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
