import cv2
import mediapipe as mp
import numpy as np
import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

@dataclass
class PoseLandmark:
    x: float
    y: float
    z: float
    visibility: float

@dataclass
class SwingFrame:
    frame_number: int
    timestamp: float
    landmarks: Dict[str, PoseLandmark]
    angles: Dict[str, float]

class PoseAnalyzer:
    def __init__(self, min_detection_confidence: float = 0.5, min_tracking_confidence: float = 0.5):
        """Initialize MediaPipe pose detection with optimized parameters for golf analysis."""
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=2,  # Higher complexity for better accuracy
            enable_segmentation=False,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence
        )
        
        self.landmark_names = {
            0: 'nose', 1: 'left_eye_inner', 2: 'left_eye', 3: 'left_eye_outer',
            4: 'right_eye_inner', 5: 'right_eye', 6: 'right_eye_outer', 7: 'left_ear',
            8: 'right_ear', 9: 'mouth_left', 10: 'mouth_right', 11: 'left_shoulder',
            12: 'right_shoulder', 13: 'left_elbow', 14: 'right_elbow', 15: 'left_wrist',
            16: 'right_wrist', 17: 'left_pinky', 18: 'right_pinky', 19: 'left_index',
            20: 'right_index', 21: 'left_thumb', 22: 'right_thumb', 23: 'left_hip',
            24: 'right_hip', 25: 'left_knee', 26: 'right_knee', 27: 'left_ankle',
            28: 'right_ankle', 29: 'left_heel', 30: 'right_heel', 31: 'left_foot_index',
            32: 'right_foot_index'
        }

    def calculate_angle(self, point1: PoseLandmark, point2: PoseLandmark, point3: PoseLandmark) -> float:
        """Calculate angle between three points using vector mathematics."""
        # Convert to numpy arrays for vector calculations
        a = np.array([point1.x, point1.y])
        b = np.array([point2.x, point2.y])
        c = np.array([point3.x, point3.y])
        
        # Calculate vectors
        ba = a - b
        bc = c - b
        
        # Calculate angle using dot product
        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
        angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
        
        return np.degrees(angle)

    def extract_golf_angles(self, landmarks: Dict[str, PoseLandmark]) -> Dict[str, float]:
        """Extract golf-specific angles from pose landmarks."""
        angles = {}
        
        try:
            # Left arm angle (shoulder-elbow-wrist)
            if all(key in landmarks for key in ['left_shoulder', 'left_elbow', 'left_wrist']):
                angles['left_arm'] = self.calculate_angle(
                    landmarks['left_shoulder'],
                    landmarks['left_elbow'],
                    landmarks['left_wrist']
                )
            
            # Right arm angle
            if all(key in landmarks for key in ['right_shoulder', 'right_elbow', 'right_wrist']):
                angles['right_arm'] = self.calculate_angle(
                    landmarks['right_shoulder'],
                    landmarks['right_elbow'],
                    landmarks['right_wrist']
                )
            
            # Spine angle (hip-shoulder alignment)
            if all(key in landmarks for key in ['left_hip', 'left_shoulder', 'right_shoulder', 'right_hip']):
                # Calculate spine tilt relative to vertical
                hip_center = PoseLandmark(
                    x=(landmarks['left_hip'].x + landmarks['right_hip'].x) / 2,
                    y=(landmarks['left_hip'].y + landmarks['right_hip'].y) / 2,
                    z=0,
                    visibility=1.0
                )
                shoulder_center = PoseLandmark(
                    x=(landmarks['left_shoulder'].x + landmarks['right_shoulder'].x) / 2,
                    y=(landmarks['left_shoulder'].y + landmarks['right_shoulder'].y) / 2,
                    z=0,
                    visibility=1.0
                )
                
                # Reference point for vertical alignment
                vertical_ref = PoseLandmark(
                    x=shoulder_center.x,
                    y=shoulder_center.y - 0.1,  # Point above shoulder
                    z=0,
                    visibility=1.0
                )
                
                angles['spine_tilt'] = self.calculate_angle(
                    hip_center,
                    shoulder_center,
                    vertical_ref
                )
            
            # Knee angles for weight transfer analysis
            if all(key in landmarks for key in ['left_hip', 'left_knee', 'left_ankle']):
                angles['left_knee'] = self.calculate_angle(
                    landmarks['left_hip'],
                    landmarks['left_knee'],
                    landmarks['left_ankle']
                )
            
            if all(key in landmarks for key in ['right_hip', 'right_knee', 'right_ankle']):
                angles['right_knee'] = self.calculate_angle(
                    landmarks['right_hip'],
                    landmarks['right_knee'],
                    landmarks['right_ankle']
                )
                
        except Exception as e:
            print(f"Error calculating angles: {e}")
            
        return angles

    def process_frame(self, frame: np.ndarray, frame_number: int, timestamp: float) -> Optional[SwingFrame]:
        """Process single video frame and extract pose data."""
        # Convert BGR to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb_frame.flags.writeable = False
        
        # Process with MediaPipe
        results = self.pose.process(rgb_frame)
        
        if not results.pose_landmarks:
            return None
            
        # Extract landmarks
        landmarks = {}
        for idx, landmark in enumerate(results.pose_landmarks.landmark):
            landmark_name = self.landmark_names.get(idx, f'landmark_{idx}')
            landmarks[landmark_name] = PoseLandmark(
                x=landmark.x,
                y=landmark.y,
                z=landmark.z,
                visibility=landmark.visibility
            )
        
        # Calculate golf-specific angles
        angles = self.extract_golf_angles(landmarks)
        
        return SwingFrame(
            frame_number=frame_number,
            timestamp=timestamp,
            landmarks=landmarks,
            angles=angles
        )

    def draw_annotations(self, frame: np.ndarray, swing_frame: SwingFrame) -> np.ndarray:
        """Draw pose landmarks and angle annotations on frame."""
        annotated_frame = frame.copy()
        height, width = frame.shape[:2]
        
        # Draw skeleton/pose landmarks
        self._draw_pose_skeleton(annotated_frame, swing_frame, width, height)
        
        # Draw angle measurements
        self._draw_angle_overlays(annotated_frame, swing_frame.angles)
        
        return annotated_frame
    
    def _draw_pose_skeleton(self, frame: np.ndarray, swing_frame: SwingFrame, width: int, height: int):
        """Draw the pose skeleton with golf-specific highlights."""
        # Key connections for golf analysis
        connections = [
            ('left_shoulder', 'right_shoulder'),
            ('left_shoulder', 'left_elbow'),
            ('left_elbow', 'left_wrist'),
            ('right_shoulder', 'right_elbow'),
            ('right_elbow', 'right_wrist'),
            ('left_hip', 'right_hip'),
            ('left_shoulder', 'left_hip'),
            ('right_shoulder', 'right_hip'),
            ('left_hip', 'left_knee'),
            ('left_knee', 'left_ankle'),
            ('right_hip', 'right_knee'),
            ('right_knee', 'right_ankle')
        ]
        
        # Draw connections
        for start_point, end_point in connections:
            if start_point in swing_frame.landmarks and end_point in swing_frame.landmarks:
                start_landmark = swing_frame.landmarks[start_point]
                end_landmark = swing_frame.landmarks[end_point]
                
                start_x, start_y = int(start_landmark.x * width), int(start_landmark.y * height)
                end_x, end_y = int(end_landmark.x * width), int(end_landmark.y * height)
                
                cv2.line(frame, (start_x, start_y), (end_x, end_y), (0, 255, 0), 2)
        
        # Highlight key points
        key_points = ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
                     'left_wrist', 'right_wrist', 'left_hip', 'right_hip']
        
        for point_name in key_points:
            if point_name in swing_frame.landmarks:
                landmark = swing_frame.landmarks[point_name]
                x = int(landmark.x * width)
                y = int(landmark.y * height)
                
                # Draw highlighted circle for key points
                cv2.circle(frame, (x, y), 8, (0, 255, 255), -1)  # Yellow circles
                cv2.circle(frame, (x, y), 10, (0, 0, 255), 2)   # Red border
    
    def _draw_angle_overlays(self, frame: np.ndarray, angles: Dict[str, float]):
        """Draw angle measurements as text overlays."""
        y_offset = 30
        for angle_name, angle_value in angles.items():
            text = f"{angle_name.replace('_', ' ').title()}: {angle_value:.1f}°"
            cv2.putText(frame, text, (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 
                       0.6, (255, 255, 255), 2, cv2.LINE_AA)
            cv2.putText(frame, text, (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 
                       0.6, (0, 0, 0), 1, cv2.LINE_AA)
            y_offset += 25

    def __del__(self):
        """Clean up MediaPipe resources."""
        if hasattr(self, 'pose'):
            self.pose.close()