// Enhanced Upload Zone for SwingAlyze
import React, { useCallback, useState } from 'react';
import { Upload, Video, Image as ImageIcon, AlertCircle } from 'lucide-react';

export default function EnhancedUploadZone({ onFile, analyzing = false, progress = 0 }) {
  const [isOver, setIsOver] = useState(false);
  const [error, setError] = useState(null);

  const validateFile = (file) => {
    const maxSize = 200 * 1024 * 1024; // 200MB (increased for larger golf videos)
    const allowedTypes = [
      'video/mp4', 
      'video/mov', 
      'video/quicktime',  // For .MOV files
      'video/avi', 
      'video/x-msvideo',
      'video/webm',
      'video/3gpp',
      'video/x-ms-wmv',
      'image/jpeg', 
      'image/jpg',
      'image/png',
      'image/webp'
    ];
    
    // Check file extension as backup
    const fileName = file.name.toLowerCase();
    const allowedExtensions = ['.mp4', '.mov', '.avi', '.webm', '.3gp', '.wmv', '.jpg', '.jpeg', '.png', '.webp'];
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    
    if (file.size > maxSize) {
      return 'File size must be less than 200MB';
    }
    
    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      return 'Please upload MP4, MOV, AVI, WebM, JPG, or PNG files only';
    }
    
    return null;
  };

  const handleFile = useCallback((file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setError(null);
    onFile(file);
  }, [onFile]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*,image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
        onDragLeave={() => setIsOver(false)}
        onDrop={onDrop}
        onClick={onFileSelect}
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300
          ${isOver 
            ? 'border-green-400 bg-green-50 scale-105' 
            : analyzing 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
          }
          ${analyzing ? 'pointer-events-none' : ''}
        `}
      >
        <div className="flex flex-col items-center space-y-4">
          {analyzing ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin">
                <Upload className="h-12 w-12 text-blue-500" />
              </div>
              <div className="text-lg font-medium text-blue-700">Analyzing Swing...</div>
              <div className="w-64 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-sm text-blue-600">{progress}% Complete</div>
            </div>
          ) : (
            <>
              <Upload className="h-16 w-16 text-gray-400" />
              <div>
                <div className="text-xl font-semibold text-gray-700 mb-2">
                  Drop your swing video here
                </div>
                <div className="text-gray-500 mb-4">or click to browse files</div>
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex items-center space-x-2 bg-green-100 text-green-700 px-3 py-2 rounded-lg">
                    <Video className="h-4 w-4" />
                    <span className="text-sm font-medium">Video</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg">
                    <ImageIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">Image</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center">
        Supported formats: MP4, MOV, AVI, WebM, JPG, PNG • Max size: 200MB
      </div>
    </div>
  );
}