from fastapi import FastAPI, APIRouter, UploadFile, File
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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="SwingAlyze API", description="Golf Swing Analysis Platform")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class SwingAnalysis(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default_user"
    filename: str
    club_speed: float
    ball_speed: float
    launch_angle: float
    accuracy: float
    consistency: float
    recommendations: List[str]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SwingAnalysisCreate(BaseModel):
    filename: str
    club_speed: float
    ball_speed: float
    launch_angle: float
    accuracy: float
    consistency: float
    recommendations: List[str]

class SwingHistory(BaseModel):
    id: str
    date: str
    score: int
    clubSpeed: int
    accuracy: int

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "SwingAlyze API - Golf Swing Analysis Platform"}

@api_router.post("/upload", response_model=dict)
async def upload_swing_video(file: UploadFile = File(...)):
    """Upload swing video for analysis"""
    try:
        # In a real app, you would save the file and process it
        # For now, we'll just return success
        return {
            "message": "Video uploaded successfully",
            "filename": file.filename,
            "content_type": file.content_type,
            "status": "uploaded"
        }
    except Exception as e:
        return {"error": str(e)}

@api_router.post("/analyze", response_model=SwingAnalysis)
async def analyze_swing(analysis: SwingAnalysisCreate):
    """Save swing analysis results"""
    try:
        analysis_obj = SwingAnalysis(**analysis.dict())
        _ = await db.swing_analyses.insert_one(analysis_obj.dict())
        return analysis_obj
    except Exception as e:
        # Return mock data for demo
        return SwingAnalysis(
            filename=analysis.filename,
            club_speed=analysis.club_speed,
            ball_speed=analysis.ball_speed,
            launch_angle=analysis.launch_angle,
            accuracy=analysis.accuracy,
            consistency=analysis.consistency,
            recommendations=analysis.recommendations
        )

@api_router.get("/swings", response_model=List[SwingHistory])
async def get_swing_history():
    """Get user's swing history"""
    try:
        swing_analyses = await db.swing_analyses.find().to_list(1000)
        history = []
        for analysis in swing_analyses:
            history.append(SwingHistory(
                id=analysis["id"],
                date=analysis["timestamp"].strftime("%Y-%m-%d"),
                score=int(analysis["accuracy"]),
                clubSpeed=int(analysis["club_speed"]),
                accuracy=int(analysis["accuracy"])
            ))
        return history
    except Exception as e:
        # Return mock data for demo
        return [
            SwingHistory(id="1", date="2025-08-23", score=85, clubSpeed=95, accuracy=78),
            SwingHistory(id="2", date="2025-08-22", score=82, clubSpeed=97, accuracy=81),
            SwingHistory(id="3", date="2025-08-21", score=88, clubSpeed=93, accuracy=75),
            SwingHistory(id="4", date="2025-08-20", score=79, clubSpeed=89, accuracy=73),
            SwingHistory(id="5", date="2025-08-19", score=83, clubSpeed=94, accuracy=77)
        ]

@api_router.get("/stats")
async def get_user_stats():
    """Get user statistics"""
    try:
        # In real app, calculate from database
        return {
            "total_swings": 124,
            "improvement_percentage": 15,
            "average_club_speed": 92,
            "average_accuracy": 78,
            "best_score": 95,
            "recent_trend": "improving"
        }
    except Exception as e:
        return {"error": str(e)}

@api_router.delete("/swing/{swing_id}")
async def delete_swing(swing_id: str):
    """Delete a swing analysis"""
    try:
        result = await db.swing_analyses.delete_one({"id": swing_id})
        if result.deleted_count:
            return {"message": "Swing deleted successfully"}
        else:
            return {"error": "Swing not found"}
    except Exception as e:
        return {"error": str(e)}

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