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

class TrackCoordinates(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)

class TrackResponse(BaseModel):
    id: str
    challenge_id: str
    coordinates: List[dict]  # Array of {lat: number, lng: number} objects
    created_at: Optional[Union[datetime, str]] = None

@router.get("/{challenge_id}")
async def get_challenge_track(challenge_id: str):
    """Get the track coordinates for a challenge"""
    try:
        # Check if challenge exists
        challenge = supabase.table('challenges').select('*').eq('id', challenge_id).execute()
        if not challenge.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Get track
        result = supabase.table('tracks').select('*').eq('challenge_id', challenge_id).execute()
        
        if not result.data:
            return {"coordinates": []}
        
        return {"coordinates": result.data[0]['coordinates']}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{challenge_id}")
async def update_challenge_track(challenge_id: str, coordinates: List[TrackCoordinates]):
    """Update or create track coordinates for a challenge"""
    try:
        # Check if challenge exists
        challenge = supabase.table('challenges').select('*').eq('id', challenge_id).execute()
        if not challenge.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Convert coordinates to list of dicts
        coords_data = [{"lat": coord.lat, "lng": coord.lng} for coord in coordinates]
        
        # Check if track already exists
        existing_track = supabase.table('tracks').select('*').eq('challenge_id', challenge_id).execute()
        
        if existing_track.data:
            # Update existing track
            result = supabase.table('tracks').update({'coordinates': coords_data}).eq('challenge_id', challenge_id).execute()
        else:
            # Create new track
            track_data = {
                'challenge_id': challenge_id,
                'coordinates': coords_data
            }
            result = supabase.table('tracks').insert(track_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update track")
        
        return {"message": "Track updated successfully", "coordinates": coords_data}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 