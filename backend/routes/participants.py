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

router = APIRouter(prefix="/participants", tags=["participants"])

class ParticipantBase(BaseModel):
    code_name: str = Field(..., min_length=1, max_length=50)
    avatar_url: Optional[str] = None
    stake_amount: float = Field(..., gt=0)

class ParticipantCreate(ParticipantBase):
    user_id: Optional[str] = None

class ParticipantResponse(ParticipantBase):
    id: int
    challenge_id: int
    user_id: Optional[str]
    status: str = Field(..., pattern="^(joined|running|completed)$")
    start_time: Optional[Union[datetime, str]] = None
    end_time: Optional[Union[datetime, str]] = None
    completion_time: Optional[str] = None  # Format: "HH:MM"
    distance_covered: Optional[float] = None  # Actual distance covered during run
    elevation_gained: Optional[int] = None  # Actual elevation gained during run
    track_data: Optional[dict] = None  # GPS track data from the run
    stake_transaction_hash: Optional[str] = None  # Blockchain transaction hash
    joined_at: Optional[Union[datetime, str]] = None
    updated_at: Optional[Union[datetime, str]] = None

class ParticipantUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(joined|running|completed)$")
    start_time: Optional[Union[datetime, str]] = None
    end_time: Optional[Union[datetime, str]] = None
    completion_time: Optional[str] = None
    distance_covered: Optional[float] = None
    elevation_gained: Optional[int] = None
    track_data: Optional[dict] = None

@router.put("/{challenge_id}/{participant_id}", response_model=ParticipantResponse)
async def update_participant(
    challenge_id: int, 
    participant_id: int, 
    participant_update: ParticipantUpdate
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
        
        return ParticipantResponse(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 