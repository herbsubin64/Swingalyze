from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import aiofiles
import mimetypes
import shutil
import cv2
import mediapipe as mp
import numpy as np
import json
import base64
import asyncio


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Supported video formats
SUPPORTED_VIDEO_FORMATS = {
    'video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 
    'video/webm', 'video/ogg', 'video/x-matroska', 'video/3gpp',
    'video/x-flv', 'video/x-ms-wmv', 'video/mov'
}

# Golf Pose Detector Class
class GolfPoseDetector:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        # Configure pose detection for golf swing analysis
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=2,  # Use highest accuracy model
            enable_segmentation=False,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        
        # Define key landmarks for golf swing analysis
        self.key_landmarks = {
            'left_shoulder': self.mp_pose.PoseLandmark.LEFT_SHOULDER,
            'right_shoulder': self.mp_pose.PoseLandmark.RIGHT_SHOULDER,
            'left_elbow': self.mp_pose.PoseLandmark.LEFT_ELBOW,
            'right_elbow': self.mp_pose.PoseLandmark.RIGHT_ELBOW,
            'left_wrist': self.mp_pose.PoseLandmark.LEFT_WRIST,
            'right_wrist': self.mp_pose.PoseLandmark.RIGHT_WRIST,
            'left_hip': self.mp_pose.PoseLandmark.LEFT_HIP,
            'right_hip': self.mp_pose.PoseLandmark.RIGHT_HIP,
            'left_knee': self.mp_pose.PoseLandmark.LEFT_KNEE,
            'right_knee': self.mp_pose.PoseLandmark.RIGHT_KNEE,
            'left_ankle': self.mp_pose.PoseLandmark.LEFT_ANKLE,
            'right_ankle': self.mp_pose.PoseLandmark.RIGHT_ANKLE
        }
    
    def detect_pose(self, image):
        """Detect pose landmarks in the input image"""
        # Convert BGR to RGB for MediaPipe processing
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image_rgb.flags.writeable = False
        
        # Perform pose detection
        results = self.pose.process(image_rgb)
        
        # Convert back to BGR for OpenCV operations
        image_rgb.flags.writeable = True
        image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
        
        pose_data = None
        if results.pose_landmarks:
            # Extract landmark coordinates
            pose_data = self.extract_landmarks(results.pose_landmarks, image.shape)
            
            # Draw pose landmarks on image (ghost skeleton)
            self.mp_drawing.draw_landmarks(
                image_bgr,
                results.pose_landmarks,
                self.mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=self.mp_drawing_styles.get_default_pose_landmarks_style()
            )
        
        return image_bgr, pose_data
    
    def extract_landmarks(self, landmarks, image_shape):
        """Extract and normalize landmark coordinates"""
        height, width = image_shape[:2]
        
        landmark_data = {
            'timestamp': cv2.getTickCount(),
            'image_dimensions': {'width': width, 'height': height},
            'landmarks': {},
            'angles': {},
            'distances': {}
        }
        
        # Extract key landmark coordinates
        for name, landmark_id in self.key_landmarks.items():
            landmark = landmarks.landmark[landmark_id]
            landmark_data['landmarks'][name] = {
                'x': int(landmark.x * width),
                'y': int(landmark.y * height),
                'z': landmark.z,
                'visibility': landmark.visibility
            }
        
        # Calculate critical angles for golf swing analysis
        landmark_data['angles'] = self.calculate_golf_angles(landmark_data['landmarks'])
        
        # Calculate key distances
        landmark_data['distances'] = self.calculate_distances(landmark_data['landmarks'])
        
        return landmark_data
    
    def calculate_golf_angles(self, landmarks):
        """Calculate golf-specific angles from landmark coordinates"""
        angles = {}
        
        try:
            # Calculate spine angle (posture)
            if all(key in landmarks for key in ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip']):
                spine_angle = self.calculate_spine_angle(
                    landmarks['left_shoulder'], landmarks['right_shoulder'],
                    landmarks['left_hip'], landmarks['right_hip']
                )
                angles['spine_angle'] = spine_angle
            
            # Calculate arm angles
            if all(key in landmarks for key in ['left_shoulder', 'left_elbow', 'left_wrist']):
                left_arm_angle = self.calculate_joint_angle(
                    landmarks['left_shoulder'], landmarks['left_elbow'], landmarks['left_wrist']
                )
                angles['left_arm_angle'] = left_arm_angle
            
            if all(key in landmarks for key in ['right_shoulder', 'right_elbow', 'right_wrist']):
                right_arm_angle = self.calculate_joint_angle(
                    landmarks['right_shoulder'], landmarks['right_elbow'], landmarks['right_wrist']
                )
                angles['right_arm_angle'] = right_arm_angle
            
            # Calculate knee flexion angles
            if all(key in landmarks for key in ['left_hip', 'left_knee', 'left_ankle']):
                left_knee_angle = self.calculate_joint_angle(
                    landmarks['left_hip'], landmarks['left_knee'], landmarks['left_ankle']
                )
                angles['left_knee_angle'] = left_knee_angle
                
        except Exception as e:
            print(f"Error calculating angles: {e}")
            
        return angles
    
    def calculate_joint_angle(self, point1, point2, point3):
        """Calculate angle between three points"""
        try:
            # Create vectors
            vector1 = np.array([point1['x'] - point2['x'], point1['y'] - point2['y']])
            vector2 = np.array([point3['x'] - point2['x'], point3['y'] - point2['y']])
            
            # Check for zero-length vectors (division by zero protection)
            norm1 = np.linalg.norm(vector1)
            norm2 = np.linalg.norm(vector2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0  # Return 0 degrees if vectors are zero-length
            
            # Calculate angle using dot product
            cosine_angle = np.dot(vector1, vector2) / (norm1 * norm2)
            angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
            
            return np.degrees(angle)
        except Exception as e:
            print(f"Error calculating joint angle: {e}")
            return 0.0
    
    def calculate_spine_angle(self, left_shoulder, right_shoulder, left_hip, right_hip):
        """Calculate spine angle for posture analysis"""
        # Calculate midpoints
        shoulder_midpoint = {
            'x': (left_shoulder['x'] + right_shoulder['x']) / 2,
            'y': (left_shoulder['y'] + right_shoulder['y']) / 2
        }
        hip_midpoint = {
            'x': (left_hip['x'] + right_hip['x']) / 2,
            'y': (left_hip['y'] + right_hip['y']) / 2
        }
        
        # Calculate spine vector
        spine_vector = np.array([
            shoulder_midpoint['x'] - hip_midpoint['x'],
            shoulder_midpoint['y'] - hip_midpoint['y']
        ])
        
        # Calculate angle with vertical
        vertical_vector = np.array([0, -1])
        cosine_angle = np.dot(spine_vector, vertical_vector) / np.linalg.norm(spine_vector)
        angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
        
        return np.degrees(angle)
    
    def calculate_distances(self, landmarks):
        """Calculate key distances between landmarks"""
        distances = {}
        
        try:
            # Calculate shoulder width
            if 'left_shoulder' in landmarks and 'right_shoulder' in landmarks:
                dx = landmarks['right_shoulder']['x'] - landmarks['left_shoulder']['x']
                dy = landmarks['right_shoulder']['y'] - landmarks['left_shoulder']['y']
                distances['shoulder_width'] = np.sqrt(dx**2 + dy**2)
            
            # Calculate arm span
            if 'left_wrist' in landmarks and 'right_wrist' in landmarks:
                dx = landmarks['right_wrist']['x'] - landmarks['left_wrist']['x']
                dy = landmarks['right_wrist']['y'] - landmarks['left_wrist']['y']
                distances['arm_span'] = np.sqrt(dx**2 + dy**2)
                
        except Exception as e:
            print(f"Error calculating distances: {e}")
            
        return distances

# Initialize pose detector
pose_detector = GolfPoseDetector()

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connection established. Active connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket connection closed. Active connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected connections
        for connection in disconnected:
            self.disconnect(connection)

manager = ConnectionManager()

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class VideoUpload(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_filename: str
    file_size: int
    content_type: str
    upload_timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = "completed"
    file_path: str

class SwingAnalysis(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    video_id: str
    swing_phases: List[dict]
    biomechanical_data: dict
    recommendations: List[str]
    ghost_skeleton_data: Optional[dict] = None
    analysis_timestamp: datetime = Field(default_factory=datetime.utcnow)

# Utility function to validate video format
def is_video_file(content_type: str, filename: str) -> bool:
    # Check by content type first
    if content_type and content_type in SUPPORTED_VIDEO_FORMATS:
        return True
    
    # Fallback to file extension
    mime_type, _ = mimetypes.guess_type(filename)
    if mime_type and mime_type in SUPPORTED_VIDEO_FORMATS:
        return True
    
    # Check common video extensions
    video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.ogg', '.3gp', '.flv', '.wmv'}
    file_ext = Path(filename).suffix.lower()
    return file_ext in video_extensions

def is_valid_video_content(content: bytes) -> bool:
    """
    Validate video file content by checking for common video file signatures
    More lenient validation to allow legitimate video files
    """
    if len(content) < 4:  # Need at least 4 bytes for basic checks
        return False
    
    # Common video file signatures (magic numbers)
    video_signatures = [
        # MP4/MOV signatures - more comprehensive
        b'ftyp',  # General MP4/MOV indicator (can appear after initial bytes)
        b'\x00\x00\x00\x18ftyp',  # MP4
        b'\x00\x00\x00\x20ftyp',  # MP4
        b'\x00\x00\x00\x1cftyp', # MP4 ISO
        b'ftypmp4',  # MP4
        b'ftypisom', # MP4 ISO
        b'ftypM4V',  # M4V
        b'ftypqt',   # QuickTime
        b'ftyp3gp',  # 3GP
        b'ftypMSNV', # Sony PSP
        
        # AVI signature
        b'RIFF',  # AVI (RIFF header)
        b'AVI ',  # AVI format identifier
        
        # WebM/MKV signature
        b'\x1a\x45\xdf\xa3',  # WebM/MKV EBML header
        
        # OGG signature
        b'OggS',  # OGG container
        
        # FLV signature
        b'FLV\x01',  # FLV
        b'FLV',      # FLV (more lenient)
        
        # WMV/ASF signature
        b'\x30\x26\xb2\x75',  # ASF header start
        
        # Additional video signatures
        b'mdat',  # MP4 media data atom
        b'moov',  # MP4 movie atom
    ]
    
    # Check first 32 bytes for any video signature
    check_bytes = content[:32] if len(content) >= 32 else content
    
    for signature in video_signatures:
        if signature in check_bytes:
            return True
    
    # Special patterns for different video formats
    try:
        # Check for RIFF + AVI pattern
        if b'RIFF' in check_bytes and b'AVI' in content[:100]:
            return True
        
        # Check for MP4 box structure (ftyp box)
        if b'ftyp' in content[:100]:
            return True
        
        # Check for QuickTime movie header
        if b'mdat' in content[:100] or b'moov' in content[:100]:
            return True
            
    except:
        pass
    
    return False

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Swingalyze - AI Golf Swing Analysis with Ghost Skeleton Ready"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

@api_router.post("/upload", response_model=VideoUpload)
async def upload_video(request: Request, file: UploadFile = File(...)):
    """
    Upload golf swing video for analysis with proper validation
    """
    try:
        # Validate file type
        if not is_video_file(file.content_type, file.filename):
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file format. Supported formats: MP4, AVI, MOV, MKV, WebM, OGG, 3GP, FLV, WMV"
            )
        
        # Read file content for validation
        content = await file.read()
        
        # Validate minimum file size (videos should be at least 1KB)
        if len(content) < 1024:
            raise HTTPException(
                status_code=400,
                detail="File too small to be a valid video. Please upload a proper video file."
            )
        
        # Basic video file validation - check for common video file signatures
        if not is_valid_video_content(content):
            raise HTTPException(
                status_code=400,
                detail="Invalid video file content. Please upload a valid video file."
            )
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix.lower()
        if not file_extension:
            # Try to determine extension from content type
            extension_map = {
                'video/mp4': '.mp4',
                'video/quicktime': '.mov',
                'video/x-msvideo': '.avi',
                'video/webm': '.webm',
                'video/ogg': '.ogv',
                'video/x-matroska': '.mkv'
            }
            file_extension = extension_map.get(file.content_type, '.mp4')
        
        unique_filename = f"{file_id}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Write file content to disk
        async with aiofiles.open(file_path, 'wb') as buffer:
            await buffer.write(content)
        
        # Create video upload record
        video_upload = VideoUpload(
            id=file_id,
            filename=unique_filename,
            original_filename=file.filename,
            file_size=len(content),
            content_type=file.content_type or 'video/mp4',
            file_path=str(file_path)
        )
        
        # Store in database
        await db.video_uploads.insert_one(video_upload.dict())
        
        logger.info(f"Successfully uploaded video: {file.filename} ({len(content)} bytes)")
        return video_upload
        
    except HTTPException:
        # Re-raise HTTP exceptions (like validation errors) as-is
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@api_router.post("/analyze/{video_id}")
async def analyze_golf_swing(video_id: str):
    """
    Analyze uploaded golf swing video with ghost skeleton superimposition
    """
    try:
        # Find video in database
        video_record = await db.video_uploads.find_one({"id": video_id})
        if not video_record:
            raise HTTPException(status_code=404, detail="Video not found")
        
        file_path = Path(video_record["file_path"])
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Video file not found on disk")
        
        # Process video for swing analysis
        analysis_result = await process_golf_video_analysis(str(file_path), video_id)
        
        # Store analysis results
        swing_analysis = SwingAnalysis(
            video_id=video_id,
            swing_phases=analysis_result['swing_phases'],
            biomechanical_data=analysis_result['biomechanical_data'],
            recommendations=analysis_result['recommendations'],
            ghost_skeleton_data=analysis_result.get('ghost_skeleton_data')
        )
        
        await db.swing_analyses.insert_one(swing_analysis.dict())
        
        return analysis_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing swing for video {video_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

async def process_golf_video_analysis(video_path: str, video_id: str):
    """
    Process golf swing video and extract comprehensive analysis with ghost skeleton
    """
    analysis_result = {
        "video_id": video_id,
        "video_info": {},
        "swing_phases": [],
        "biomechanical_data": {},
        "recommendations": [],
        "ghost_skeleton_data": {},
        "overlay_video": None
    }
    
    cap = cv2.VideoCapture(video_path)
    
    try:
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Validate video properties
        if fps <= 0 or frame_count <= 0 or width <= 0 or height <= 0:
            raise ValueError("Invalid video file or corrupted video properties")
        
        analysis_result["video_info"] = {
            "fps": fps,
            "frame_count": frame_count,
            "width": width,
            "height": height,
            "duration": frame_count / fps
        }
        
        # Initialize video writer for ghost skeleton overlay
        overlay_path = UPLOAD_DIR / f"ghost_skeleton_{video_id}.mp4"
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        overlay_writer = cv2.VideoWriter(str(overlay_path), fourcc, fps, (width, height))
        
        # Process frames for pose detection and ghost skeleton
        frame_data = []
        frame_index = 0
        valid_frames = 0
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            # Detect pose and create ghost skeleton overlay
            try:
                annotated_frame, pose_data = pose_detector.detect_pose(frame)
                
                if pose_data:
                    pose_data['frame_index'] = frame_index
                    pose_data['timestamp'] = frame_index / fps
                    frame_data.append(pose_data)
                    valid_frames += 1
                
                # Write ghost skeleton overlay frame
                overlay_writer.write(annotated_frame)
            except Exception as e:
                logger.warning(f"Error processing frame {frame_index}: {e}")
                # Write original frame if pose detection fails
                overlay_writer.write(frame)
            
            frame_index += 1
        
        overlay_writer.release()
        
        # Check if we have enough valid frames for analysis
        if valid_frames < 5:  # Minimum frames needed for meaningful analysis
            # Still provide basic analysis even with limited data
            analysis_result["swing_phases"] = []
            analysis_result["biomechanical_data"] = {
                "overall_metrics": {},
                "phase_metrics": {},
                "consistency_analysis": {},
                "ghost_skeleton_insights": {
                    "pose_tracking_quality": 0.0,
                    "swing_tempo": {'tempo': 'unknown', 'duration': 0, 'frames_per_second': 0},
                    "body_rotation": {}
                }
            }
            analysis_result["recommendations"] = [
                "Unable to detect clear pose landmarks in this video.",
                "For better analysis, ensure good lighting and clear visibility of the golfer.",
                "Consider recording from a side angle with the full body visible.",
                "Make sure the golfer is clearly distinguishable from the background."
            ]
        else:
            # Analyze swing phases
            swing_phases = analyze_swing_phases(frame_data)
            analysis_result["swing_phases"] = swing_phases
            
            # Calculate biomechanical metrics
            biomechanical_data = calculate_biomechanical_metrics(frame_data, swing_phases)
            analysis_result["biomechanical_data"] = biomechanical_data
            
            # Generate recommendations
            recommendations = generate_swing_recommendations(biomechanical_data)
            analysis_result["recommendations"] = recommendations
        
        # Ghost skeleton data
        analysis_result["ghost_skeleton_data"] = {
            "total_frames": len(frame_data),
            "pose_detection_rate": (len(frame_data) / frame_count * 100) if frame_count > 0 else 0,
            "key_angles_tracked": list(frame_data[0]['angles'].keys()) if frame_data else [],
            "overlay_video_path": str(overlay_path)
        }
        
        analysis_result["overlay_video"] = f"/api/ghost-skeleton/{video_id}"
        
    except Exception as e:
        logger.error(f"Error in video analysis: {e}")
        # Provide fallback analysis result
        analysis_result["swing_phases"] = []
        analysis_result["biomechanical_data"] = {"error": "Analysis failed due to video processing error"}
        analysis_result["recommendations"] = [
            f"Video analysis failed: {str(e)}",
            "Please try uploading a different video with clear visibility of the golfer."
        ]
        analysis_result["ghost_skeleton_data"] = {
            "total_frames": 0,
            "pose_detection_rate": 0,
            "key_angles_tracked": [],
            "overlay_video_path": ""
        }
    finally:
        cap.release()
    
    return analysis_result

def analyze_swing_phases(frame_data):
    """Analyze golf swing phases from pose data"""
    if not frame_data:
        return []
    
    phases = []
    
    # Extract wrist trajectory for swing phase detection
    wrist_positions = []
    for frame in frame_data:
        if 'right_wrist' in frame['landmarks']:
            wrist_positions.append({
                'frame': frame['frame_index'],
                'timestamp': frame['timestamp'],
                'x': frame['landmarks']['right_wrist']['x'],
                'y': frame['landmarks']['right_wrist']['y']
            })
    
    if len(wrist_positions) < 10:  # Insufficient data
        return phases
    
    # Detect swing phases based on wrist movement patterns
    # This is a simplified implementation - real analysis would be more sophisticated
    total_frames = len(wrist_positions)
    
    # Define phases based on trajectory analysis
    phases = [
        {
            'phase_name': 'address',
            'start_frame': 0,
            'end_frame': int(total_frames * 0.15),
            'description': 'Setup and address position',
            'key_metrics': extract_phase_metrics(frame_data, 0, int(total_frames * 0.15))
        },
        {
            'phase_name': 'backswing',
            'start_frame': int(total_frames * 0.15),
            'end_frame': int(total_frames * 0.45),
            'description': 'Backswing to top position',
            'key_metrics': extract_phase_metrics(frame_data, int(total_frames * 0.15), int(total_frames * 0.45))
        },
        {
            'phase_name': 'top_backswing',
            'start_frame': int(total_frames * 0.45),
            'end_frame': int(total_frames * 0.55),
            'description': 'Top of backswing transition',
            'key_metrics': extract_phase_metrics(frame_data, int(total_frames * 0.45), int(total_frames * 0.55))
        },
        {
            'phase_name': 'downswing',
            'start_frame': int(total_frames * 0.55),
            'end_frame': int(total_frames * 0.75),
            'description': 'Downswing to impact',
            'key_metrics': extract_phase_metrics(frame_data, int(total_frames * 0.55), int(total_frames * 0.75))
        },
        {
            'phase_name': 'follow_through',
            'start_frame': int(total_frames * 0.75),
            'end_frame': total_frames - 1,
            'description': 'Follow-through and finish',
            'key_metrics': extract_phase_metrics(frame_data, int(total_frames * 0.75), total_frames - 1)
        }
    ]
    
    return phases

def extract_phase_metrics(frame_data, start_frame, end_frame):
    """Extract key metrics for a specific swing phase"""
    phase_frames = [f for f in frame_data if start_frame <= f['frame_index'] <= end_frame]
    
    if not phase_frames:
        return {}
    
    metrics = {}
    
    # Calculate average spine angle for this phase
    spine_angles = [f['angles'].get('spine_angle', 0) for f in phase_frames if 'spine_angle' in f.get('angles', {})]
    if spine_angles:
        metrics['avg_spine_angle'] = np.mean(spine_angles)
        metrics['spine_angle_consistency'] = np.std(spine_angles)
    
    # Calculate average arm angles
    left_arm_angles = [f['angles'].get('left_arm_angle', 0) for f in phase_frames if 'left_arm_angle' in f.get('angles', {})]
    right_arm_angles = [f['angles'].get('right_arm_angle', 0) for f in phase_frames if 'right_arm_angle' in f.get('angles', {})]
    
    if left_arm_angles:
        metrics['avg_left_arm_angle'] = np.mean(left_arm_angles)
    if right_arm_angles:
        metrics['avg_right_arm_angle'] = np.mean(right_arm_angles)
    
    return metrics

def calculate_biomechanical_metrics(frame_data, swing_phases):
    """Calculate comprehensive biomechanical metrics"""
    metrics = {
        'overall_metrics': {},
        'phase_metrics': {},
        'consistency_analysis': {},
        'ghost_skeleton_insights': {}
    }
    
    # Calculate overall swing metrics
    if frame_data:
        # Spine angle consistency
        spine_angles = [f['angles']['spine_angle'] for f in frame_data if 'spine_angle' in f.get('angles', {})]
        if spine_angles:
            metrics['overall_metrics']['spine_angle_avg'] = np.mean(spine_angles)
            metrics['overall_metrics']['spine_angle_std'] = np.std(spine_angles)
            metrics['overall_metrics']['spine_angle_range'] = max(spine_angles) - min(spine_angles)
        
        # Arm extension analysis
        right_arm_angles = [f['angles']['right_arm_angle'] for f in frame_data if 'right_arm_angle' in f.get('angles', {})]
        if right_arm_angles:
            metrics['overall_metrics']['arm_extension_avg'] = np.mean(right_arm_angles)
            metrics['overall_metrics']['arm_extension_consistency'] = np.std(right_arm_angles)
        
        # Ghost skeleton specific insights
        metrics['ghost_skeleton_insights'] = {
            'pose_tracking_quality': calculate_pose_tracking_quality(frame_data),
            'swing_tempo': calculate_swing_tempo(frame_data),
            'body_rotation': calculate_body_rotation_metrics(frame_data)
        }
    
    # Calculate phase-specific metrics
    for phase in swing_phases:
        if 'key_metrics' in phase:
            metrics['phase_metrics'][phase['phase_name']] = phase['key_metrics']
    
    return metrics

def calculate_pose_tracking_quality(frame_data):
    """Calculate the quality of pose tracking throughout the swing"""
    if not frame_data:
        return 0.0
    
    total_quality = 0.0
    valid_frames = 0
    
    for frame in frame_data:
        landmarks = frame.get('landmarks', {})
        if landmarks:  # Only calculate if landmarks exist
            visible_count = sum(1 for landmark in landmarks.values() 
                              if isinstance(landmark, dict) and landmark.get('visibility', 0) > 0.5)
            quality = visible_count / len(landmarks) if len(landmarks) > 0 else 0
            total_quality += quality
            valid_frames += 1
    
    return total_quality / valid_frames if valid_frames > 0 else 0.0

def calculate_swing_tempo(frame_data):
    """Calculate swing tempo metrics"""
    if len(frame_data) < 2:
        return {'tempo': 'unknown', 'duration': 0, 'frames_per_second': 0}
    
    total_duration = frame_data[-1]['timestamp'] - frame_data[0]['timestamp']
    
    # Protect against division by zero
    if total_duration <= 0:
        return {'tempo': 'unknown', 'duration': 0, 'frames_per_second': 0}
    
    # Simple tempo classification
    if total_duration < 1.2:
        tempo = 'fast'
    elif total_duration > 2.0:
        tempo = 'slow'
    else:
        tempo = 'moderate'
    
    return {
        'tempo': tempo,
        'duration': total_duration,
        'frames_per_second': len(frame_data) / total_duration
    }

def calculate_body_rotation_metrics(frame_data):
    """Calculate body rotation and turning metrics"""
    if not frame_data:
        return {}
    
    shoulder_rotations = []
    
    for frame in frame_data:
        landmarks = frame.get('landmarks', {})
        if 'left_shoulder' in landmarks and 'right_shoulder' in landmarks:
            left_shoulder = landmarks['left_shoulder']
            right_shoulder = landmarks['right_shoulder']
            
            # Calculate shoulder line angle (simple rotation indicator)
            dx = right_shoulder['x'] - left_shoulder['x']
            dy = right_shoulder['y'] - left_shoulder['y']
            angle = np.degrees(np.arctan2(dy, dx))
            shoulder_rotations.append(angle)
    
    if shoulder_rotations:
        rotation_range = max(shoulder_rotations) - min(shoulder_rotations)
        return {
            'shoulder_rotation_range': rotation_range,
            'max_rotation': max(shoulder_rotations),
            'min_rotation': min(shoulder_rotations)
        }
    
    return {}

def generate_swing_recommendations(biomechanical_data):
    """Generate swing improvement recommendations based on analysis"""
    recommendations = []
    
    overall_metrics = biomechanical_data.get('overall_metrics', {})
    
    # Spine angle recommendations
    spine_angle_avg = overall_metrics.get('spine_angle_avg')
    if spine_angle_avg:
        if spine_angle_avg > 25:
            recommendations.append("Consider maintaining a more upright posture at address. Your spine angle is quite bent.")
        elif spine_angle_avg < 10:
            recommendations.append("You might benefit from slightly more forward bend in your posture for better swing plane.")
    
    # Consistency recommendations
    spine_std = overall_metrics.get('spine_angle_std')
    if spine_std and spine_std > 10:
        recommendations.append("Focus on maintaining consistent posture throughout your swing for better repeatability.")
    
    # Arm extension recommendations
    arm_consistency = overall_metrics.get('arm_extension_consistency')
    if arm_consistency and arm_consistency > 15:
        recommendations.append("Work on maintaining consistent arm extension for more reliable ball striking.")
    
    # Ghost skeleton specific recommendations
    ghost_insights = biomechanical_data.get('ghost_skeleton_insights', {})
    pose_quality = ghost_insights.get('pose_tracking_quality', 0)
    
    if pose_quality < 0.7:
        recommendations.append("Consider practicing in better lighting or with less background clutter for improved analysis accuracy.")
    
    swing_tempo = ghost_insights.get('swing_tempo', {})
    if swing_tempo.get('tempo') == 'fast':
        recommendations.append("Your swing tempo is quite fast. Try slowing down for better control and consistency.")
    elif swing_tempo.get('tempo') == 'slow':
        recommendations.append("Your swing tempo is quite slow. Consider slightly increasing pace for more natural rhythm.")
    
    if not recommendations:
        recommendations.append("Great swing! Your biomechanics look solid. Keep practicing to maintain consistency.")
    
    return recommendations

@api_router.get("/uploads", response_model=List[VideoUpload])
async def get_uploads():
    """Get list of all uploaded videos"""
    try:
        uploads = await db.video_uploads.find().sort("upload_timestamp", -1).to_list(100)
        return [VideoUpload(**upload) for upload in uploads]
    except Exception as e:
        logger.error(f"Error fetching uploads: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch uploads")

@api_router.get("/uploads/{video_id}")
async def get_video_file(video_id: str):
    """Serve uploaded video file"""
    try:
        # Find video in database
        video_record = await db.video_uploads.find_one({"id": video_id})
        if not video_record:
            raise HTTPException(status_code=404, detail="Video not found")
        
        file_path = Path(video_record["file_path"])
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Video file not found on disk")
        
        # Return file with proper content type
        return FileResponse(
            path=file_path,
            media_type=video_record["content_type"],
            filename=video_record["original_filename"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving video {video_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to serve video")

@api_router.get("/ghost-skeleton/{video_id}")
async def get_ghost_skeleton_video(video_id: str):
    """Serve ghost skeleton overlay video"""
    try:
        overlay_path = UPLOAD_DIR / f"ghost_skeleton_{video_id}.mp4"
        
        if not overlay_path.exists():
            raise HTTPException(status_code=404, detail="Ghost skeleton overlay not found")
        
        return FileResponse(
            path=overlay_path,
            media_type="video/mp4",
            filename=f"ghost_skeleton_{video_id}.mp4"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving ghost skeleton video {video_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to serve ghost skeleton video")

@api_router.get("/analysis/{video_id}")
async def get_swing_analysis(video_id: str):
    """Get swing analysis results for a video"""
    try:
        analysis = await db.swing_analyses.find_one({"video_id": video_id})
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        # Remove MongoDB ObjectId to make it JSON serializable
        if '_id' in analysis:
            del analysis['_id']
        
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching analysis for video {video_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch analysis")

@api_router.delete("/uploads/{video_id}")
async def delete_video(video_id: str):
    """Delete uploaded video and associated analysis"""
    try:
        # Find video in database
        video_record = await db.video_uploads.find_one({"id": video_id})
        if not video_record:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Delete original file from disk
        file_path = Path(video_record["file_path"])
        if file_path.exists():
            file_path.unlink()
        
        # Delete ghost skeleton overlay
        overlay_path = UPLOAD_DIR / f"ghost_skeleton_{video_id}.mp4"
        if overlay_path.exists():
            overlay_path.unlink()
        
        # Delete from database
        await db.video_uploads.delete_one({"id": video_id})
        await db.swing_analyses.delete_one({"video_id": video_id})
        
        return {"message": "Video and analysis deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting video {video_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete video")

# WebSocket endpoint for real-time analysis
@api_router.websocket("/ws/realtime-analysis")
async def websocket_realtime_analysis(websocket: WebSocket):
    """Real-time golf swing analysis with ghost skeleton overlay"""
    await manager.connect(websocket)
    
    try:
        while True:
            # Receive frame data from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message['type'] == 'video_frame':
                # Process frame for real-time analysis
                frame_data = base64.b64decode(message['frame_data'])
                
                # Convert to OpenCV format
                nparr = np.frombuffer(frame_data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if frame is not None:
                    # Perform pose detection and ghost skeleton overlay
                    annotated_frame, pose_data = pose_detector.detect_pose(frame)
                    
                    # Encode annotated frame back to base64
                    _, buffer = cv2.imencode('.jpg', annotated_frame)
                    encoded_frame = base64.b64encode(buffer).decode('utf-8')
                    
                    # Prepare response
                    response = {
                        'type': 'analyzed_frame',
                        'annotated_frame': encoded_frame,
                        'pose_detected': pose_data is not None
                    }
                    
                    if pose_data:
                        response['pose_data'] = {
                            'angles': pose_data['angles'],
                            'quality_score': calculate_pose_tracking_quality([pose_data])
                        }
                    
                    await manager.send_personal_message(response, websocket)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await manager.send_personal_message({
            'type': 'error',
            'message': str(e)
        }, websocket)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()