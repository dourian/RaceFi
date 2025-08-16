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

router = APIRouter(prefix="/challenge-attendee", tags=["challenge-attendee"])

class ChallengeAttendeeBase(BaseModel):
    code_name: str = Field(..., min_length=1, max_length=50)
    avatar_url: Optional[str] = None
    stake_amount: float = Field(..., gt=0)

class ChallengeAttendeeCreate(ChallengeAttendeeBase):
    profile_id: str = Field(..., min_length=1)

class ChallengeAttendeeResponse(ChallengeAttendeeBase):
    id: int
    challenge_id: int
    profile_id: str
    user_id: Optional[str]
    status: str = Field(..., pattern="^(joined|running|completed)$")
    start_time: Optional[Union[datetime, str]] = None
    end_time: Optional[Union[datetime, str]] = None
    completion_time: Optional[str] = None
    distance_covered: Optional[float] = None
    elevation_gained: Optional[int] = None
    track_data: Optional[dict] = None
    stake_transaction_hash: Optional[str] = None
    joined_at: Optional[Union[datetime, str]] = None
    updated_at: Optional[Union[datetime, str]] = None

class ChallengeAttendeeUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(joined|running|completed)$")
    start_time: Optional[Union[datetime, str]] = None
    end_time: Optional[Union[datetime, str]] = None
    completion_time: Optional[str] = None
    distance_covered: Optional[float] = None
    elevation_gained: Optional[int] = None
    track_data: Optional[dict] = None

@router.post("/{challenge_id}", response_model=ChallengeAttendeeResponse)
async def create_challenge_attendee(challenge_id: int, challenge_attendee: ChallengeAttendeeCreate):
    """Create a new participant for a specific challenge"""
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
        
        # Check if participant already exists
        existing_participant = supabase.table('participants').select('*').eq('challenge_id', challenge_id).eq('profile_id', challenge_attendee.profile_id).execute()
        if existing_participant.data:
            raise HTTPException(status_code=400, detail="Profile already participating in this challenge")
        
        # Create participant
        participant_data = challenge_attendee.dict()
        participant_data['challenge_id'] = challenge_id
        participant_data['status'] = 'joined'
        result = supabase.table('participants').insert(participant_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create participant")
        
        # Update challenge participants count
        supabase.table('challenges').update({
            'participants_count': challenge.data[0]['participants_count'] + 1
        }).eq('id', challenge_id).execute()
        
        return ChallengeAttendeeResponse(**result.data[0])
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{challenge_id}/{participant_id}", response_model=ChallengeAttendeeResponse)
async def update_challenge_attendee(
    challenge_id: int, 
    participant_id: int, 
    participant_update: ChallengeAttendeeUpdate
):
    """Update a participant's information (e.g., status, run data)"""
    try:
        # Check if challenge exists
        challenge = supabase.table('challenges').select('*').eq('id', challenge_id).execute()
        if not challenge.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Check if participant exists
        existing_participant = supabase.table('participants').select('*').eq('id', participant_id).eq('challenge_id', challenge_id).execute()
        if not existing_participant.data:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Update participant
        update_data = participant_update.dict(exclude_unset=True)
        result = supabase.table('participants').update(update_data).eq('id', participant_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update participant")
        
        return ChallengeAttendeeResponse(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 