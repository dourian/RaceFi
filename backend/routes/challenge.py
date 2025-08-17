from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Union
from pydantic import BaseModel, Field
from datetime import datetime
from supabase import create_client, Client
from config import settings
from .challenge_attendee import create_challenge_attendee, ChallengeAttendeeCreate, ChallengeAttendeeResponse

supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY
)

router = APIRouter(prefix="/challenges", tags=["challenges"])

class ChallengeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    distance_km: float = Field(..., gt=0, le=1000)
    stake: float = Field(..., gt=0)
    elevation: int = Field(..., ge=0)
    difficulty: str = Field(..., pattern="^(Easy|Moderate|Hard)$")
    max_participants: int = Field(..., gt=0, le=1000)
    location: str = Field(..., min_length=1, max_length=255)
    start_date: str
    end_date: str

class ChallengeCreate(ChallengeBase):
    created_by_profile_id: int = Field(..., ge=1)
    polyline: Optional[str] = None

class ChallengeUpdate(BaseModel):
    id: int = Field(..., ge=1)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    distance_km: Optional[float] = Field(None, gt=0, le=1000)
    stake: Optional[float] = Field(None, gt=0)
    elevation: Optional[int] = Field(None, ge=0)
    difficulty: Optional[str] = Field(None, pattern="^(Easy|Moderate|Hard)$")
    max_participants: Optional[int] = Field(None, gt=0, le=1000)
    location: Optional[str] = Field(None, min_length=1, max_length=255)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = None

class ChallengeResponse(ChallengeBase):
    id: int
    is_active: bool
    created_at: Optional[Union[datetime, str]] = None
    updated_at: Optional[Union[datetime, str]] = None
    creator_id: Optional[str] = None


def validate_challenge_dates(start_date: str, end_date: str):
    try:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        if start_dt >= end_dt:
            raise HTTPException(
                status_code=400, 
                detail="Start date must be before end date"
            )
        
        if start_dt < datetime.utcnow():
            raise HTTPException(
                status_code=400, 
                detail="Start date cannot be in the past"
            )
        
        if (end_dt - start_dt).days > 30:
            raise HTTPException(
                status_code=400, 
                detail="Challenge duration cannot exceed 30 days"
            )
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail="Invalid date format. Use ISO format: YYYY-MM-DDTHH:MM:SS"
        )

@router.post("/", response_model=ChallengeResponse)
async def create_challenge(challenge: ChallengeCreate):
    """Create a new challenge"""
    try:
        validate_challenge_dates(challenge.start_date, challenge.end_date)
        
        challenge_data = challenge.dict(exclude={'polyline'})
        
        # Insert challenge
        result = supabase.table('challenges').insert(challenge_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create challenge")
        
        challenge_id = result.data[0]['id']
        
        # Insert track coordinates if provided
        if challenge.polyline:
            track_data = {
                'challenge_id': challenge_id,
                'polyline': challenge.polyline
            }
            supabase.table('tracks').insert(track_data).execute()
        
        return ChallengeResponse(**result.data[0])
        
    except Exception as e:
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=409, detail="Challenge with this name already exists")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list", response_model=List[ChallengeResponse])
async def get_challenges(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    difficulty: Optional[str] = Query(None, regex="^(Easy|Moderate|Hard)$"),
    location: Optional[str] = None,
    is_active: Optional[bool] = None
):
    """Get all challenges with optional filtering"""
    try:
        query = supabase.table('challenges').select('*')
        
        if difficulty:
            query = query.eq('difficulty', difficulty)
        
        if location:
            query = query.ilike('location', f'%{location}%')
        
        if is_active is not None:
            query = query.eq('is_active', is_active)
        
        # Order by creation date (newest first)
        query = query.order('created_at', desc=True)
        
        # Apply pagination
        query = query.range(skip, skip + limit - 1)
        
        result = query.execute()
        
        if not result.data:
            return []
        
        return [ChallengeResponse(**challenge) for challenge in result.data]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{challenge_id}", response_model=ChallengeResponse)
async def get_challenge(challenge_id: int):
    """Get a specific challenge by ID"""
    try:
        result = supabase.table('challenges').select('*').eq('id', challenge_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        return ChallengeResponse(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/", response_model=ChallengeResponse)
async def update_challenge(request: ChallengeUpdate):
    """Update a challenge"""
    try:
        # Check if challenge exists
        existing = supabase.table('challenges').select('*').eq('id', request.id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Validate dates if both are provided
        if request.start_date and request.end_date:
            validate_challenge_dates(request.start_date, request.end_date)
        
        # Update challenge
        update_data = request.dict(exclude_unset=True)
        result = supabase.table('challenges').update(update_data).eq('id', request.id).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update challenge")
        
        return ChallengeResponse(**result.data[0])
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{challenge_id}")
async def delete_challenge(challenge_id: int):
    """Delete a challenge permanently"""
    try:
        # Check if challenge exists
        existing = supabase.table('challenges').select('*').eq('id', challenge_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Hard delete the challenge
        result = supabase.table('challenges').delete().eq('id', challenge_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to delete challenge")
        
        return {"message": "Challenge deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{challenge_id}/join", response_model=ChallengeAttendeeResponse)
async def join_challenge(challenge_id: int, profile_data: ChallengeAttendeeCreate):
    """Join a challenge as a participant using profile_id"""
    return await create_challenge_attendee(challenge_id, profile_data)

@router.get("/{challenge_id}/participants", response_model=List[ChallengeAttendeeResponse])
async def get_challenge_participants(challenge_id: int):
    """Get all participants for a specific challenge"""
    try:
        # Check if challenge exists
        challenge = supabase.table('challenges').select('*').eq('id', challenge_id).execute()
        if not challenge.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Get participants
        result = supabase.table('challenge_attendees').select('*').eq('challenge_id', challenge_id).execute()
        
        if not result.data:
            return []
        
        return [ChallengeAttendeeResponse(**participant) for participant in result.data]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
