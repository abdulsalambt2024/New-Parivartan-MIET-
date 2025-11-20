import React, { useState, useRef } from 'react';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperProps {
  imageUrl: string;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageUrl, onCrop, onCancel }) => {
  const [scale, setScale] = useState(1);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleCrop = () => {
    if (!imageRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    // For demo purposes, we'll just center crop a square from the scaled image view
    // A real implementation would need coordinate math relative to the viewport
    const size = Math.min(img.naturalWidth, img.naturalHeight);
    canvas.width = size;
    canvas.height = size;

    if (ctx) {
        const offsetX = (img.naturalWidth - size) / 2;
        const offsetY = (img.naturalHeight - size) / 2;
        
        ctx.drawImage(
            img,
            offsetX, offsetY, size, size, // Source
            0, 0, size, size // Dest
        );
        onCrop(canvas.toDataURL('image/jpeg'));
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full animate-fade-in">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Crop Image</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
        </div>
        
        <div className="h-[400px] bg-gray-100 flex items-center justify-center overflow-hidden relative select-none">
            <img 
                ref={imageRef}
                src={imageUrl} 
                alt="Crop Target" 
                style={{ transform: `scale(${scale})` }}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
            />
            {/* Simple Overlay Grid */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] w-64 h-64">
                    <div className="grid grid-cols-3 grid-rows-3 w-full h-full">
                        {[...Array(9)].map((_, i) => <div key={i} className="border border-white/30"></div>)}
                    </div>
                </div>
            </div>
        </div>

        <div className="p-4 border-t flex justify-between items-center bg-gray-50">
            <div className="flex items-center gap-4">
                <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2 hover:bg-gray-200 rounded-full text-gray-600">
                    <ZoomOut size={20} />
                </button>
                <span className="text-sm font-medium text-gray-700">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-2 hover:bg-gray-200 rounded-full text-gray-600">
                    <ZoomIn size={20} />
                </button>
            </div>
            <button onClick={handleCrop} className="bg-primary text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 font-medium">
                <Check size={18} /> Crop & Done
            </button>
        </div>
      </div>
    </div>
  );
};