from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Form, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import shutil
import aiofiles
import asyncio

from swing_analyzer import SwingAnalyzer


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory if it doesn't exist
UPLOAD_DIR = ROOT_DIR / "uploads" 
RESULTS_DIR = ROOT_DIR / "uploads" / "results"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="SwingAnalyze API", description="AI-Powered Golf Swing Analysis Platform")

# Mount static files for video serving and results
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Initialize swing analyzer
swing_analyzer = SwingAnalyzer()


# Define Models
class SwingAnalysis(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_name: str
    club_type: str
    swing_speed: Optional[float] = None
    ball_speed: Optional[float] = None
    distance: Optional[float] = None
    accuracy_rating: Optional[int] = None  # 1-10 scale
    notes: Optional[str] = None
    video_url: Optional[str] = None  # Path to uploaded video
    analysis_results: Optional[Dict[str, Any]] = None  # AI analysis results
    analysis_status: str = "pending"  # pending, processing, completed, failed
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SwingAnalysisCreate(BaseModel):
    player_name: str
    club_type: str
    swing_speed: Optional[float] = None
    ball_speed: Optional[float] = None
    distance: Optional[float] = None
    accuracy_rating: Optional[int] = None
    notes: Optional[str] = None

class PlayerStats(BaseModel):
    player_name: str
    total_swings: int
    avg_swing_speed: float
    avg_ball_speed: float
    avg_distance: float
    avg_accuracy: float
    best_distance: float
    most_used_club: str

# API Routes
@api_router.get("/")
async def root():
    return {"message": "SwingAnalyze API - Golf Swing Analysis Platform with Video Support"}

@api_router.post("/analysis", response_model=SwingAnalysis)
async def create_swing_analysis(
    player_name: str = Form(...),
    club_type: str = Form(...),
    swing_speed: Optional[float] = Form(None),
    ball_speed: Optional[float] = Form(None),
    distance: Optional[float] = Form(None),
    accuracy_rating: Optional[int] = Form(None),
    notes: Optional[str] = Form(None),
    video: Optional[UploadFile] = File(None)
):
    """Create a new swing analysis record with optional video upload"""
    
    # Generate unique ID for this analysis
    analysis_id = str(uuid.uuid4())
    video_url = None
    
    # Handle video upload if provided
    if video:
        # Validate video file type
        allowed_types = ["video/mp4", "video/avi", "video/mov", "video/quicktime", "video/x-msvideo"]
        if video.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid video format. Allowed formats: MP4, AVI, MOV. Got: {video.content_type}"
            )
        
        # Check file size (limit to 100MB)
        max_size = 100 * 1024 * 1024  # 100MB in bytes
        video_content = await video.read()
        if len(video_content) > max_size:
            raise HTTPException(status_code=400, detail="Video file too large. Maximum size is 100MB.")
        
        # Generate unique filename
        file_extension = Path(video.filename).suffix
        video_filename = f"{analysis_id}_{video.filename}"
        video_path = UPLOAD_DIR / video_filename
        
        # Save video file
        try:
            async with aiofiles.open(video_path, 'wb') as f:
                await f.write(video_content)
            video_url = f"/uploads/videos/{video_filename}"
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")
    
    # Create analysis object
    analysis_data = {
        "id": analysis_id,
        "player_name": player_name,
        "club_type": club_type,
        "swing_speed": swing_speed,
        "ball_speed": ball_speed,
        "distance": distance,
        "accuracy_rating": accuracy_rating,
        "notes": notes,
        "video_url": video_url
    }
    
    analysis_obj = SwingAnalysis(**analysis_data)
    
    result = await db.swing_analyses.insert_one(analysis_obj.dict())
    if not result.inserted_id:
        raise HTTPException(status_code=500, detail="Failed to create analysis")
    
    return analysis_obj

@api_router.get("/analysis", response_model=List[SwingAnalysis])
async def get_swing_analyses(player_name: Optional[str] = None, limit: int = 50):
    """Get swing analysis records, optionally filtered by player name"""
    query = {}
    if player_name:
        query["player_name"] = player_name
    
    analyses = await db.swing_analyses.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    return [SwingAnalysis(**analysis) for analysis in analyses]

@api_router.get("/analysis/{analysis_id}", response_model=SwingAnalysis)
async def get_swing_analysis(analysis_id: str):
    """Get a specific swing analysis by ID"""
    analysis = await db.swing_analyses.find_one({"id": analysis_id})
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return SwingAnalysis(**analysis)

@api_router.delete("/analysis/{analysis_id}")
async def delete_swing_analysis(analysis_id: str):
    """Delete a swing analysis record and associated video"""
    # Get the analysis first to find video file
    analysis = await db.swing_analyses.find_one({"id": analysis_id})
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Delete video file if it exists
    if analysis.get("video_url"):
        video_filename = analysis["video_url"].split("/")[-1]
        video_path = UPLOAD_DIR / video_filename
        if video_path.exists():
            try:
                video_path.unlink()
            except Exception as e:
                logging.warning(f"Failed to delete video file {video_path}: {str(e)}")
    
    # Delete from database
    result = await db.swing_analyses.delete_one({"id": analysis_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return {"message": "Analysis and associated video deleted successfully"}

@api_router.get("/players")
async def get_players():
    """Get list of all players"""
    pipeline = [
        {"$group": {"_id": "$player_name"}},
        {"$sort": {"_id": 1}}
    ]
    players = await db.swing_analyses.aggregate(pipeline).to_list(1000)
    return [player["_id"] for player in players]

@api_router.get("/stats/{player_name}", response_model=PlayerStats)
async def get_player_stats(player_name: str):
    """Get comprehensive stats for a specific player"""
    pipeline = [
        {"$match": {"player_name": player_name}},
        {
            "$group": {
                "_id": "$player_name",
                "total_swings": {"$sum": 1},
                "avg_swing_speed": {"$avg": "$swing_speed"},
                "avg_ball_speed": {"$avg": "$ball_speed"},
                "avg_distance": {"$avg": "$distance"},
                "avg_accuracy": {"$avg": "$accuracy_rating"},
                "best_distance": {"$max": "$distance"},
                "clubs": {"$push": "$club_type"}
            }
        }
    ]
    
    result = await db.swing_analyses.aggregate(pipeline).to_list(1)
    if not result:
        raise HTTPException(status_code=404, detail="Player not found")
    
    stats = result[0]
    
    # Find most used club
    clubs = stats.get("clubs", [])
    most_used_club = max(set(clubs), key=clubs.count) if clubs else "N/A"
    
    return PlayerStats(
        player_name=player_name,
        total_swings=stats.get("total_swings", 0),
        avg_swing_speed=round(stats.get("avg_swing_speed", 0) or 0, 1),
        avg_ball_speed=round(stats.get("avg_ball_speed", 0) or 0, 1),
        avg_distance=round(stats.get("avg_distance", 0) or 0, 1),
        avg_accuracy=round(stats.get("avg_accuracy", 0) or 0, 1),
        best_distance=round(stats.get("best_distance", 0) or 0, 1),
        most_used_club=most_used_club
    )

@api_router.get("/clubs")
async def get_club_types():
    """Get list of all club types used"""
    pipeline = [
        {"$group": {"_id": "$club_type"}},
        {"$sort": {"_id": 1}}
    ]
    clubs = await db.swing_analyses.aggregate(pipeline).to_list(1000)
    return [club["_id"] for club in clubs]

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