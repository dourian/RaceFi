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

router = APIRouter(prefix="/runs", tags=["runs"])

class RunBase(BaseModel):
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    distance_km: Optional[float] = None
    elevation_meters: Optional[int] = None
    avg_pace_min_per_km: Optional[float] = None
    max_speed_kmh: Optional[float] = None
    gps_track: Optional[dict] = None  # Detailed GPS coordinates with timestamps
    is_valid: Optional[bool] = True  # Whether the run follows the track
    deviation_score: Optional[float] = None  # How much the run deviated from track (0-1)

class RunCreate(RunBase):
    participant_id: str
    challenge_id: str

class RunResponse(RunBase):
    id: str
    participant_id: str
    challenge_id: str
    created_at: Optional[Union[datetime, str]] = None

@router.post("/{challenge_id}/participants/{participant_id}", response_model=RunResponse)
async def create_run(challenge_id: str, participant_id: str, run: RunCreate):
    """Create a new run for a participant"""
    try:
        # Check if challenge exists
        challenge = supabase.table('challenges').select('*').eq('id', challenge_id).execute()
        if not challenge.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Check if participant exists and is part of this challenge
        participant = supabase.table('participants').select('*').eq('id', participant_id).eq('challenge_id', challenge_id).execute()
        if not participant.data:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Create run
        run_data = run.dict()
        result = supabase.table('runs').insert(run_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create run")
        
        return RunResponse(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{challenge_id}/participants/{participant_id}", response_model=List[RunResponse])
async def get_participant_runs(challenge_id: str, participant_id: str):
    """Get all runs for a specific participant in a challenge"""
    try:
        # Check if challenge exists
        challenge = supabase.table('challenges').select('*').eq('id', challenge_id).execute()
        if not challenge.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Check if participant exists and is part of this challenge
        participant = supabase.table('participants').select('*').eq('id', participant_id).eq('challenge_id', challenge_id).execute()
        if not participant.data:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Get runs
        result = supabase.table('runs').select('*').eq('challenge_id', challenge_id).eq('participant_id', participant_id).execute()
        
        if not result.data:
            return []
        
        return [RunResponse(**run) for run in result.data]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{challenge_id}", response_model=List[RunResponse])
async def get_challenge_runs(challenge_id: str):
    """Get all runs for a specific challenge"""
    try:
        # Check if challenge exists
        challenge = supabase.table('challenges').select('*').eq('id', challenge_id).execute()
        if not challenge.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Get all runs for the challenge
        result = supabase.table('runs').select('*').eq('challenge_id', challenge_id).execute()
        
        if not result.data:
            return []
        
        return [RunResponse(**run) for run in result.data]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 