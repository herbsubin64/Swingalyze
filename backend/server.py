from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Request
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

class UploadProgress(BaseModel):
    upload_id: str
    progress: float
    status: str
    message: Optional[str] = None

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

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Bulletproof Video Upload API Ready"}

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
    Bulletproof video upload endpoint with extended timeout support
    """
    try:
        # Validate file type
        if not is_video_file(file.content_type, file.filename):
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file format. Supported formats: MP4, AVI, MOV, MKV, WebM, OGG, 3GP, FLV, WMV"
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
        
        # Track file size
        file_size = 0
        
        # Stream file to disk to handle large files efficiently
        async with aiofiles.open(file_path, 'wb') as buffer:
            while chunk := await file.read(8192):  # Read in 8KB chunks
                file_size += len(chunk)
                await buffer.write(chunk)
        
        # Create video upload record
        video_upload = VideoUpload(
            id=file_id,
            filename=unique_filename,
            original_filename=file.filename,
            file_size=file_size,
            content_type=file.content_type or 'video/mp4',
            file_path=str(file_path)
        )
        
        # Store in database
        await db.video_uploads.insert_one(video_upload.dict())
        
        logger.info(f"Successfully uploaded video: {file.filename} ({file_size} bytes)")
        return video_upload
        
    except HTTPException:
        # Re-raise HTTP exceptions (like validation errors) as-is
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

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

@api_router.delete("/uploads/{video_id}")
async def delete_video(video_id: str):
    """Delete uploaded video"""
    try:
        # Find video in database
        video_record = await db.video_uploads.find_one({"id": video_id})
        if not video_record:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Delete file from disk
        file_path = Path(video_record["file_path"])
        if file_path.exists():
            file_path.unlink()
        
        # Delete from database
        await db.video_uploads.delete_one({"id": video_id})
        
        return {"message": "Video deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting video {video_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete video")

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