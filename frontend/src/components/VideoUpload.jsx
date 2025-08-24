import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Upload, Video, Camera, Play, Pause, X } from 'lucide-react';

const VideoUpload = ({ onVideoSelect, selectedVideo, onRemoveVideo }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const recordedVideoRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-msvideo'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid video file (MP4, AVI, MOV)');
        return;
      }
      
      // Validate file size (100MB limit)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        setError('Video file is too large. Maximum size is 100MB.');
        return;
      }
      
      setError('');
      onVideoSelect(file);
    }
  };

  const startRecording = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera on mobile
        }, 
        audio: true 
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      const recorder = new MediaRecorder(mediaStream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const videoFile = new File([blob], `swing_recording_${Date.now()}.webm`, { 
          type: 'video/webm' 
        });
        setRecordedVideo(videoFile);
        onVideoSelect(videoFile);
        
        // Stop all tracks
        mediaStream.getTracks().forEach(track => track.stop());
        setStream(null);
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Unable to access camera. Please check permissions and try again.');
      console.error('Error accessing camera:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const togglePlayback = () => {
    const video = recordedVideoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const removeVideo = () => {
    setRecordedVideo(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemoveVideo();
  };

  const getVideoUrl = (file) => {
    return URL.createObjectURL(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Swing Video
        </CardTitle>
        <CardDescription>
          Upload a video file or record your swing directly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!selectedVideo && !isRecording && (
          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/avi,video/mov,video/quicktime,video/x-msvideo"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Video File
              </Button>
            </div>

            <div className="text-center text-gray-500">or</div>

            {/* Record Video */}
            <Button
              type="button"
              variant="outline"
              onClick={startRecording}
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" />
              Record Swing
            </Button>
          </div>
        )}

        {/* Recording Interface */}
        {isRecording && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-64 object-cover"
              />
              <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-sm font-medium">
                RECORDING
              </div>
            </div>
            <Button
              type="button"
              onClick={stopRecording}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Stop Recording
            </Button>
          </div>
        )}

        {/* Video Preview */}
        {selectedVideo && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={recordedVideoRef}
                src={getVideoUrl(selectedVideo)}
                className="w-full h-64 object-cover"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                controls
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <strong>File:</strong> {selectedVideo.name}<br/>
                <strong>Size:</strong> {(selectedVideo.size / (1024 * 1024)).toFixed(2)} MB
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={removeVideo}
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500">
          Supported formats: MP4, AVI, MOV • Maximum size: 100MB
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoUpload;