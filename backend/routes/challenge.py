from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Union
from pydantic import BaseModel, Field
from datetime import datetime
from supabase import create_client, Client
from config import settings

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
    prize_pool: float = Field(..., gt=0)
    max_participants: int = Field(..., gt=0, le=1000)
    location: str = Field(..., min_length=1, max_length=255)
    start_date: str
    end_date: str

class ChallengeCreate(ChallengeBase):
    creator_id: Optional[str] = None
    track_coordinates: Optional[List[dict]] = None

class ChallengeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    distance_km: Optional[float] = Field(None, gt=0, le=1000)
    stake: Optional[float] = Field(None, gt=0)
    elevation: Optional[int] = Field(None, ge=0)
    difficulty: Optional[str] = Field(None, pattern="^(Easy|Moderate|Hard)$")
    prize_pool: Optional[float] = Field(None, gt=0)
    max_participants: Optional[int] = Field(None, gt=0, le=1000)
    location: Optional[str] = Field(None, min_length=1, max_length=255)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None

class ChallengeResponse(ChallengeBase):
    id: str
    participants_count: int
    is_active: bool
    created_at: Optional[Union[datetime, str]] = None
    updated_at: Optional[Union[datetime, str]] = None
    creator_id: Optional[str] = None

    # Timestamp fields are handled flexibly to avoid validation errors

class ParticipantCreate(BaseModel):
    code_name: str = Field(..., min_length=1, max_length=50)
    avatar_url: Optional[str] = None
    stake_amount: float = Field(..., gt=0)
    user_id: Optional[str] = None

class ParticipantResponse(BaseModel):
    id: str
    challenge_id: str
    user_id: Optional[str]
    code_name: str
    avatar_url: Optional[str] = None
    stake_amount: float
    status: str
    joined_at: Optional[Union[datetime, str]] = None
    updated_at: Optional[Union[datetime, str]] = None

# Helper function to validate challenge dates
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
        # Validate dates
        validate_challenge_dates(challenge.start_date, challenge.end_date)
        
        # Prepare challenge data
        challenge_data = challenge.dict(exclude={'track_coordinates'})
        challenge_data['participants_count'] = 0
        
        # Insert challenge
        result = supabase.table('challenges').insert(challenge_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create challenge")
        
        challenge_id = result.data[0]['id']
        
        # Insert track coordinates if provided
        if challenge.track_coordinates:
            track_data = {
                'challenge_id': challenge_id,
                'coordinates': challenge.track_coordinates
            }
            supabase.table('tracks').insert(track_data).execute()
        
        return ChallengeResponse(**result.data[0])
        
    except Exception as e:
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=409, detail="Challenge with this name already exists")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[ChallengeResponse])
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
async def get_challenge(challenge_id: str):
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

@router.put("/{challenge_id}", response_model=ChallengeResponse)
async def update_challenge(challenge_id: str, challenge_update: ChallengeUpdate):
    """Update a challenge"""
    try:
        # Check if challenge exists
        existing = supabase.table('challenges').select('*').eq('id', challenge_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Validate dates if both are provided
        if challenge_update.start_date and challenge_update.end_date:
            validate_challenge_dates(challenge_update.start_date, challenge_update.end_date)
        
        # Update challenge
        update_data = challenge_update.dict(exclude_unset=True)
        result = supabase.table('challenges').update(update_data).eq('id', challenge_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update challenge")
        
        return ChallengeResponse(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{challenge_id}")
async def delete_challenge(challenge_id: str):
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

@router.post("/{challenge_id}/join", response_model=ParticipantResponse)
async def join_challenge(challenge_id: str, participant: ParticipantCreate):
    """Join a challenge as a participant"""
    try:
        # Check if challenge exists and is active
        challenge = supabase.table('challenges').select('*').eq('id', challenge_id).execute()
        if not challenge.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        if not challenge.data[0]['is_active']:
            raise HTTPException(status_code=400, detail="Challenge is not active")
        
        # Check if challenge is full
        if challenge.data[0]['participants_count'] >= challenge.data[0]['max_participants']:
            raise HTTPException(status_code=400, detail="Challenge is full")
        
        # Check if user is already participating
        existing_participant = supabase.table('participants').select('*').eq('challenge_id', challenge_id).eq('user_id', participant.user_id).execute()
        if existing_participant.data:
            raise HTTPException(status_code=400, detail="Already participating in this challenge")
        
        # Create participant
        participant_data = participant.dict()
        participant_data['challenge_id'] = challenge_id
        participant_data['status'] = 'joined'
        
        result = supabase.table('participants').insert(participant_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to join challenge")
        
        return ParticipantResponse(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{challenge_id}/participants", response_model=List[ParticipantResponse])
async def get_challenge_participants(challenge_id: str):
    """Get all participants for a specific challenge"""
    try:
        # Check if challenge exists
        challenge = supabase.table('challenges').select('*').eq('id', challenge_id).execute()
        if not challenge.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Get participants
        result = supabase.table('participants').select('*').eq('challenge_id', challenge_id).execute()
        
        if not result.data:
            return []
        
        return [ParticipantResponse(**participant) for participant in result.data]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
