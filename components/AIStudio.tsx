import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { Wand2, ImagePlus, Type, Loader2, Download, Share, LayoutTemplate, Settings2 } from 'lucide-react';
import { storageService } from '../services/storageService';
import { UserRole } from '../types';

type Tab = 'generate' | 'enhance' | 'poster';

export const AIStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.USER);
  
  // Generate Settings
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('imagen-4.0-generate-001');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  
  // Enhance/Poster Settings
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');

  useEffect(() => {
      const u = storageService.getUser();
      if (u) setUserRole(u.role);
  }, []);

  // Access Control
  if (userRole === UserRole.USER) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 animate-fade-in">
              <div className="bg-blue-50 p-6 rounded-full mb-4">
                  <Wand2 size={48} className="text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Studio Restricted</h2>
              <p className="text-gray-500 max-w-md">
                  Unlock advanced AI tools including Image Generation, Enhancement, and Poster Design by upgrading to a Member account.
              </p>
          </div>
      );
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
      setResult(null);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setResult(null);
    
    try {
        let finalPrompt = prompt;
        if (model === 'gemini-2.5-flash-image') {
            // Append ratio instruction for models that take it in prompt
            finalPrompt += ` (Aspect Ratio: ${aspectRatio})`;
        }

        const imgUrl = await geminiService.generateImage(finalPrompt);
        setResult(imgUrl);
    } catch (e) {
        console.error(e);
        alert('Generation failed. Please try again.');
    }
    setLoading(false);
  };

  const handleEnhance = async () => {
    if (!previewUrl || !instruction) return;
    setLoading(true);
    setResult(null);
    const newImage = await geminiService.editImage(previewUrl, instruction);
    setResult(newImage);
    setLoading(false);
  };

  const handlePosterDesign = async () => {
      if (!previewUrl || !instruction) return;
      setLoading(true);
      setResult(null);
      const designPrompt = `Create a high-quality event poster based on this image. ${instruction}. Use professional typography and layout.`;
      const newImage = await geminiService.editImage(previewUrl, designPrompt);
      setResult(newImage);
      setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <Wand2 className="text-primary" /> AI Studio
        </h2>
        <p className="text-gray-500 mt-2">Powered by Google Gemini & Imagen</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
             <div className="flex border-b border-gray-100">
                <button 
                    onClick={() => { setActiveTab('generate'); setResult(null); }}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'generate' ? 'bg-blue-50 text-primary border-b-2 border-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    Generate
                </button>
                <button 
                    onClick={() => { setActiveTab('enhance'); setResult(null); }}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'enhance' ? 'bg-blue-50 text-primary border-b-2 border-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    Enhance
                </button>
                <button 
                    onClick={() => { setActiveTab('poster'); setResult(null); }}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'poster' ? 'bg-blue-50 text-primary border-b-2 border-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    Poster
                </button>
             </div>

             <div className="p-6 space-y-6">
                {activeTab === 'generate' && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Model</label>
                            <select 
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="imagen-4.0-generate-001">Imagen 4.0 (High Quality)</option>
                                <option value="gemini-2.5-flash-image">Gemini Flash Image (Nanobanana)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Aspect Ratio</label>
                            <select 
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="16:9">Landscape (16:9)</option>
                                <option value="1:1">Square (1:1)</option>
                                <option value="9:16">Portrait (9:16)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prompt</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="A futuristic community center with solar panels..."
                                className="w-full p-3 border border-gray-200 rounded-lg h-32 resize-none focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <button 
                            onClick={handleGenerate}
                            disabled={loading || !prompt}
                            className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition flex justify-center items-center disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : 'Generate'}
                        </button>
                    </div>
                )}

                {(activeTab === 'enhance' || activeTab === 'poster') && (
                     <div className="space-y-4 animate-fade-in">
                         <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:bg-gray-50 transition relative cursor-pointer">
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            {previewUrl ? (
                                <img src={previewUrl} className="max-h-32 mx-auto rounded" />
                            ) : (
                                <div className="text-gray-400 py-4">
                                    <ImagePlus size={24} className="mx-auto mb-1" />
                                    <span className="text-xs">Upload Image</span>
                                </div>
                            )}
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                {activeTab === 'poster' ? 'Poster Instructions' : 'Enhancement Instructions'}
                            </label>
                            <textarea
                                value={instruction}
                                onChange={(e) => setInstruction(e.target.value)}
                                placeholder={activeTab === 'poster' ? "Add title 'Charity Run', use gold colors..." : "Make it look 4k, improve lighting..."}
                                className="w-full p-3 border border-gray-200 rounded-lg h-24 resize-none focus:ring-2 focus:ring-primary outline-none"
                            />
                         </div>
                         <button 
                            onClick={activeTab === 'poster' ? handlePosterDesign : handleEnhance}
                            disabled={loading || !instruction || !previewUrl}
                            className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition flex justify-center items-center disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : (activeTab === 'poster' ? 'Design Poster' : 'Enhance Image')}
                        </button>
                     </div>
                )}
             </div>
          </div>

          {/* Preview Area */}
          <div className="lg:col-span-2">
            <div className="bg-gray-100 rounded-2xl h-full min-h-[500px] flex items-center justify-center border border-gray-200 relative overflow-hidden">
                {loading ? (
                    <div className="text-center text-gray-500">
                        <Loader2 size={48} className="animate-spin mx-auto mb-4 text-primary" />
                        <p className="font-medium">Creating magic with Gemini...</p>
                    </div>
                ) : result ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-gray-900">
                        <img src={result} alt="Result" className="max-w-full max-h-full object-contain" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md p-4 flex justify-between items-center">
                            <div className="text-white text-sm">
                                <p className="font-bold">Generated by AI</p>
                            </div>
                            <div className="flex gap-3">
                                <a href={result} download="parivartan-ai.jpg" className="p-2 bg-white/10 text-white rounded hover:bg-white/20 transition"><Download size={20} /></a>
                                <button className="p-2 bg-white/10 text-white rounded hover:bg-white/20 transition"><Share size={20} /></button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-400 text-center p-8">
                        <LayoutTemplate size={64} className="mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium">Ready to Create</h3>
                        <p className="text-sm">Select a tool and start generating.</p>
                    </div>
                )}
            </div>
          </div>
      </div>
    </div>
  );
};