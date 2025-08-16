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

router = APIRouter(prefix="/tracks", tags=["tracks"])

class TrackData(BaseModel):
    polyline: str = Field(..., description="Track data as a polyline string (encoded coordinates)")

class TrackResponse(BaseModel):
    id: int
    challenge_id: int
    polyline: str  # Track data as a polyline string
    created_at: Optional[Union[datetime, str]] = None

@router.get("/{challenge_id}")
async def get_challenge_track(challenge_id: int):
    """Get the track polyline for a challenge"""
    try:
        # Check if challenge exists
        challenge = supabase.table('challenges').select('*').eq('id', challenge_id).execute()
        if not challenge.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Get track
        result = supabase.table('tracks').select('*').eq('challenge_id', challenge_id).execute()
        
        if not result.data:
            return {"polyline": ""}
        
        return {"polyline": result.data[0]['polyline']}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{challenge_id}")
async def update_challenge_track(challenge_id: int, track: TrackData):
    """Update or create track polyline for a challenge"""
    try:
        # Check if challenge exists
        challenge = supabase.table('challenges').select('*').eq('id', challenge_id).execute()
        if not challenge.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Check if track already exists
        existing_track = supabase.table('tracks').select('*').eq('challenge_id', challenge_id).execute()
        
        if existing_track.data:
            # Update existing track
            result = supabase.table('tracks').update({'polyline': track.polyline}).eq('challenge_id', challenge_id).execute()
        else:
            # Create new track
            track_data = {
                'challenge_id': challenge_id,
                'polyline': track.polyline
            }
            result = supabase.table('tracks').insert(track_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update track")
        
        return {"message": "Track updated successfully", "polyline": track.polyline}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
