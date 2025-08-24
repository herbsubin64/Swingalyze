import cv2
import numpy as np
from typing import List, Dict, Optional, Tuple
import asyncio
import json
from pathlib import Path

from pose_analyzer import PoseAnalyzer, SwingFrame
from dataclasses import asdict

class SwingAnalyzer:
    def __init__(self):
        self.pose_analyzer = PoseAnalyzer()
        
    async def analyze_video(self, video_path: str, analysis_id: str) -> Dict:
        """Analyze a golf swing video and return comprehensive results."""
        try:
            # Open video
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Could not open video file: {video_path}")
            
            # Get video properties
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            # Process frames
            swing_frames = []
            annotated_frames = []
            frame_number = 0
            
            # Create results directory if it doesn't exist
            results_dir = Path("uploads/results")
            results_dir.mkdir(exist_ok=True)
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Process frame with pose analyzer
                timestamp = frame_number / fps if fps > 0 else frame_number * 0.033  # Assume 30fps if no fps
                swing_frame = self.pose_analyzer.process_frame(frame, frame_number, timestamp)
                
                if swing_frame:
                    swing_frames.append(swing_frame)
                    
                    # Create annotated frame
                    annotated_frame = self.pose_analyzer.draw_annotations(frame, swing_frame)
                    annotated_frames.append(annotated_frame)
                
                frame_number += 1
            
            cap.release()
            
            if len(swing_frames) < 5:
                raise ValueError("Insufficient pose data detected in video - please ensure golfer is clearly visible")
            
            # Create annotated video
            output_video_path = results_dir / f"{analysis_id}_analyzed.mp4"
            self._create_annotated_video(annotated_frames, str(output_video_path), fps or 30)
            
            # Analyze swing phases and metrics
            swing_analysis = self._analyze_swing_sequence(swing_frames)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(swing_analysis)
            
            # Calculate overall score
            overall_score = self._calculate_overall_score(swing_analysis)
            
            return {
                "analysis_id": analysis_id,
                "video_info": {
                    "total_frames": total_frames,
                    "fps": fps,
                    "duration": total_frames / fps if fps > 0 else total_frames * 0.033,
                    "width": width,
                    "height": height
                },
                "pose_data": {
                    "total_frames_analyzed": len(swing_frames),
                    "frames_with_pose": len([f for f in swing_frames if len(f.landmarks) > 10])
                },
                "swing_analysis": swing_analysis,
                "recommendations": recommendations,
                "overall_score": overall_score,
                "annotated_video_url": f"/uploads/results/{analysis_id}_analyzed.mp4",
                "key_frames": self._extract_key_frames(swing_frames, analysis_id)
            }
            
        except Exception as e:
            raise Exception(f"Analysis failed: {str(e)}")
    
    def _create_annotated_video(self, frames: List[np.ndarray], output_path: str, fps: float):
        """Create annotated video with pose overlays."""
        if not frames:
            return
        
        height, width = frames[0].shape[:2]
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        for frame in frames:
            out.write(frame)
        
        out.release()
    
    def _analyze_swing_sequence(self, swing_frames: List[SwingFrame]) -> Dict:
        """Analyze the swing sequence and extract metrics."""
        analysis = {
            "swing_phases": self._detect_swing_phases(swing_frames),
            "swing_metrics": self._calculate_swing_metrics(swing_frames),
            "body_angles": self._analyze_body_angles(swing_frames),
            "movement_analysis": self._analyze_movement_patterns(swing_frames)
        }
        
        return analysis
    
    def _detect_swing_phases(self, swing_frames: List[SwingFrame]) -> Dict:
        """Detect key phases in the golf swing."""
        if len(swing_frames) < 10:
            return {"error": "Insufficient frames for phase detection"}
        
        # Extract wrist positions for phase detection
        wrist_positions = []
        for frame in swing_frames:
            if 'right_wrist' in frame.landmarks:
                wrist = frame.landmarks['right_wrist']
                wrist_positions.append((wrist.x, wrist.y, frame.frame_number))
            elif 'left_wrist' in frame.landmarks:
                wrist = frame.landmarks['left_wrist']
                wrist_positions.append((wrist.x, wrist.y, frame.frame_number))
        
        if len(wrist_positions) < 5:
            return {"error": "Insufficient wrist tracking data"}
        
        # Simple phase detection based on wrist height
        y_positions = [pos[1] for pos in wrist_positions]
        
        # Find key points
        setup_frame = 0
        top_frame = np.argmin(y_positions)  # Lowest y (highest point)
        impact_frame = len(wrist_positions) - 1
        
        # Find impact as point of maximum velocity after top
        if top_frame < len(y_positions) - 5:
            velocities = []
            for i in range(top_frame + 1, min(len(y_positions), top_frame + 15)):
                if i > 0:
                    vel = abs(y_positions[i] - y_positions[i-1])
                    velocities.append((vel, i))
            
            if velocities:
                max_vel_frame = max(velocities, key=lambda x: x[0])[1]
                impact_frame = max_vel_frame
        
        phases = {
            "setup": {"frame": setup_frame, "timestamp": swing_frames[setup_frame].timestamp},
            "top_of_backswing": {"frame": top_frame, "timestamp": swing_frames[top_frame].timestamp},
            "impact": {"frame": min(impact_frame, len(swing_frames)-1), "timestamp": swing_frames[min(impact_frame, len(swing_frames)-1)].timestamp},
            "follow_through": {"frame": len(swing_frames)-1, "timestamp": swing_frames[-1].timestamp}
        }
        
        return phases
    
    def _calculate_swing_metrics(self, swing_frames: List[SwingFrame]) -> Dict:
        """Calculate key swing metrics."""
        metrics = {}
        
        # Calculate swing speed based on wrist movement
        wrist_speeds = []
        for i in range(1, len(swing_frames)):
            current_frame = swing_frames[i]
            prev_frame = swing_frames[i-1]
            
            if 'right_wrist' in current_frame.landmarks and 'right_wrist' in prev_frame.landmarks:
                curr_wrist = current_frame.landmarks['right_wrist']
                prev_wrist = prev_frame.landmarks['right_wrist']
                
                # Calculate distance moved
                distance = np.sqrt((curr_wrist.x - prev_wrist.x)**2 + (curr_wrist.y - prev_wrist.y)**2)
                time_diff = current_frame.timestamp - prev_frame.timestamp
                
                if time_diff > 0:
                    speed = distance / time_diff
                    wrist_speeds.append(speed)
        
        if wrist_speeds:
            metrics["max_wrist_speed"] = max(wrist_speeds)
            metrics["avg_wrist_speed"] = np.mean(wrist_speeds)
        
        # Calculate swing tempo (backswing to downswing ratio)
        phases = self._detect_swing_phases(swing_frames)
        if "setup" in phases and "top_of_backswing" in phases and "impact" in phases:
            backswing_time = phases["top_of_backswing"]["timestamp"] - phases["setup"]["timestamp"]
            downswing_time = phases["impact"]["timestamp"] - phases["top_of_backswing"]["timestamp"]
            
            if downswing_time > 0:
                metrics["tempo_ratio"] = backswing_time / downswing_time
        
        return metrics
    
    def _analyze_body_angles(self, swing_frames: List[SwingFrame]) -> Dict:
        """Analyze body angles throughout the swing."""
        angle_analysis = {}
        
        # Collect angles from each frame
        all_angles = {}
        for frame in swing_frames:
            for angle_name, angle_value in frame.angles.items():
                if angle_name not in all_angles:
                    all_angles[angle_name] = []
                all_angles[angle_name].append(angle_value)
        
        # Calculate statistics for each angle
        for angle_name, values in all_angles.items():
            if values:
                angle_analysis[angle_name] = {
                    "min": min(values),
                    "max": max(values),
                    "avg": np.mean(values),
                    "range": max(values) - min(values)
                }
        
        return angle_analysis
    
    def _analyze_movement_patterns(self, swing_frames: List[SwingFrame]) -> Dict:
        """Analyze movement patterns and stability."""
        movement_analysis = {}
        
        # Analyze hip stability
        hip_positions = []
        for frame in swing_frames:
            if 'left_hip' in frame.landmarks and 'right_hip' in frame.landmarks:
                left_hip = frame.landmarks['left_hip']
                right_hip = frame.landmarks['right_hip']
                hip_center = ((left_hip.x + right_hip.x) / 2, (left_hip.y + right_hip.y) / 2)
                hip_positions.append(hip_center)
        
        if len(hip_positions) > 1:
            # Calculate hip movement
            hip_movements = []
            for i in range(1, len(hip_positions)):
                movement = np.sqrt((hip_positions[i][0] - hip_positions[i-1][0])**2 + 
                                 (hip_positions[i][1] - hip_positions[i-1][1])**2)
                hip_movements.append(movement)
            
            movement_analysis["hip_stability"] = {
                "avg_movement": np.mean(hip_movements),
                "max_movement": max(hip_movements),
                "total_movement": sum(hip_movements)
            }
        
        return movement_analysis
    
    def _generate_recommendations(self, swing_analysis: Dict) -> List[str]:
        """Generate personalized recommendations based on analysis."""
        recommendations = []
        
        # Check swing metrics
        metrics = swing_analysis.get("swing_metrics", {})
        
        if "tempo_ratio" in metrics:
            tempo = metrics["tempo_ratio"]
            if tempo < 2.0:
                recommendations.append("Your swing is too quick - try slowing down your backswing for better tempo")
            elif tempo > 4.0:
                recommendations.append("Your backswing is too slow - try to create more rhythm between backswing and downswing")
            else:
                recommendations.append("Good swing tempo - maintain this rhythm")
        
        # Check body angles
        angles = swing_analysis.get("body_angles", {})
        
        if "spine_tilt" in angles:
            spine_range = angles["spine_tilt"].get("range", 0)
            if spine_range > 20:
                recommendations.append("Try to maintain spine angle throughout the swing - excessive movement can affect consistency")
        
        if "left_arm" in angles and "right_arm" in angles:
            left_arm_range = angles["left_arm"].get("range", 0)
            right_arm_range = angles["right_arm"].get("range", 0)
            
            if abs(left_arm_range - right_arm_range) > 15:
                recommendations.append("Work on arm synchronization - both arms should move more similarly throughout the swing")
        
        # Check movement patterns
        movement = swing_analysis.get("movement_analysis", {})
        
        if "hip_stability" in movement:
            hip_movement = movement["hip_stability"].get("total_movement", 0)
            if hip_movement > 0.1:
                recommendations.append("Focus on maintaining stable lower body - excessive hip movement can affect balance")
        
        # Add general recommendations if no specific issues found
        if len(recommendations) == 0:
            recommendations.append("Overall swing mechanics look good - continue practicing to maintain consistency")
            recommendations.append("Consider working with a golf professional for advanced techniques")
        
        return recommendations
    
    def _calculate_overall_score(self, swing_analysis: Dict) -> int:
        """Calculate an overall swing score from 0-100."""
        score = 70  # Base score
        
        # Adjust based on various factors
        metrics = swing_analysis.get("swing_metrics", {})
        
        # Tempo scoring
        if "tempo_ratio" in metrics:
            tempo = metrics["tempo_ratio"]
            if 2.5 <= tempo <= 3.5:  # Ideal tempo range
                score += 10
            elif 2.0 <= tempo <= 4.0:  # Good tempo range
                score += 5
            else:
                score -= 5
        
        # Body angle consistency scoring
        angles = swing_analysis.get("body_angles", {})
        angle_consistency_score = 0
        
        for angle_name, angle_data in angles.items():
            range_val = angle_data.get("range", 0)
            if range_val < 15:  # Good consistency
                angle_consistency_score += 2
            elif range_val > 30:  # Poor consistency
                angle_consistency_score -= 2
        
        score += min(angle_consistency_score, 15)  # Cap the bonus
        
        # Movement stability scoring
        movement = swing_analysis.get("movement_analysis", {})
        if "hip_stability" in movement:
            hip_movement = movement["hip_stability"].get("total_movement", 0)
            if hip_movement < 0.05:
                score += 5
            elif hip_movement > 0.15:
                score -= 10
        
        return max(0, min(100, score))
    
    def _extract_key_frames(self, swing_frames: List[SwingFrame], analysis_id: str) -> List[str]:
        """Extract and save key frames from the swing."""
        if len(swing_frames) < 5:
            return []
        
        # Select key frames
        key_frame_indices = [
            0,  # Setup
            len(swing_frames) // 4,  # Backswing
            len(swing_frames) // 2,  # Top
            3 * len(swing_frames) // 4,  # Downswing
            len(swing_frames) - 1  # Follow-through
        ]
        
        key_frame_urls = []
        results_dir = Path("uploads/results")
        
        for i, frame_idx in enumerate(key_frame_indices):
            if frame_idx < len(swing_frames):
                frame_url = f"/uploads/results/{analysis_id}_key_frame_{i}.jpg"
                key_frame_urls.append(frame_url)
        
        return key_frame_urls