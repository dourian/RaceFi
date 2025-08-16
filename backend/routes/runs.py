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
    start_time: str
    end_time: Optional[str] = None
    duration_seconds: Optional[int] = None
    distance_km: Optional[float] = None
    elevation_meters: Optional[int] = None
    avg_pace_min_per_km: Optional[float] = None
    max_speed_kmh: Optional[float] = None
    polyline: Optional[str] = None
    deviation_score: Optional[float] = None

class RunCreate(RunBase):
    challenge_attendee_id: int
    challenge_id: int

class RunUpdate(RunBase):
    id: int
    deviation_score: Optional[float] = None
    polyline: Optional[str] = None
    distance_km: Optional[float] = None
    elevation_meters: Optional[int] = None
    avg_pace_min_per_km: Optional[float] = None
    max_speed_kmh: Optional[float] = None
    is_active: Optional[bool] = None

class RunResponse(RunBase):
    id: int
    challenge_attendee_id: int
    challenge_id: int
    created_at: Optional[Union[datetime, str]] = None

class ChallengeRequest(BaseModel):
    challenge_id: int

class ParticipantRequest(BaseModel):
    challenge_attendee_id: int

@router.post("/", response_model=RunResponse)
async def create_run(run: RunCreate):
    """Create a new run"""
    try:
        # Check if challenge exists
        challenge = supabase.table('challenges').select('*').eq('id', run.challenge_id).execute()
        if not challenge.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Check if participant exists and is part of this challenge
        participant = supabase.table('challenge_attendees').select('*').eq('id', run.challenge_attendee_id).eq('challenge_id', run.challenge_id).execute()
        if not participant.data:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Create run
        run_data = run.dict()
        result = supabase.table('runs').insert(run_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create run")
        
        return RunResponse(**result.data[0])
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/participant", response_model=List[RunResponse])
async def get_participant_runs(request: ParticipantRequest):
    """Get all runs for a specific participant"""
    try:
        # Check if participant exists
        participant = supabase.table('challenge_attendees').select('*').eq('id', request.challenge_attendee_id).execute()
        if not participant.data:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Get runs
        result = supabase.table('runs').select('*').eq('challenge_attendee_id', request.challenge_attendee_id).execute()
        
        if not result.data:
            return []
        
        return [RunResponse(**run) for run in result.data]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/challenge", response_model=List[RunResponse])
async def get_challenge_runs(request: ChallengeRequest):
    """Get all runs for a specific challenge"""
    try:
        challenge = supabase.table('challenges').select('*').eq('id', request.challenge_id).execute()
        if not challenge.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        result = supabase.table('runs').select('*').eq('challenge_id', request.challenge_id).execute()
        
        if not result.data:
            return []
        
        return [RunResponse(**run) for run in result.data]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update", response_model=RunResponse)
async def update_run(request: RunUpdate):
    """Update a run"""
    try:
        result = supabase.table('runs').update(request.dict()).eq('id', request.id).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update run")
        
        return RunResponse(**result.data[0])
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
