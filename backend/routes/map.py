from fastapi import APIRouter, HTTPException, Request
from typing import List
from pydantic import BaseModel
import os
import numpy as np
from scipy.spatial.distance import directed_hausdorff
import polyline
from stravalib.client import Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Strava client
client = Client()

# Pydantic model for compare request
class CompareRequest(BaseModel):
    activity_id1: int = None
    activity_id2: int = None
    polyline1: str = None  # Encoded polyline string
    polyline2: str = None  # Encoded polyline string
    threshold_ratio: float = 0.02  # Optional, defaults to 0.02

router = APIRouter(prefix="/maps", tags=["maps"])

@router.get("/authorize")
async def authorize_strava():
    """Get Strava authorization URL"""
    client_id = os.getenv("STRAVA_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="STRAVA_CLIENT_ID not configured")
    
    url = client.authorization_url(
        client_id=client_id,
        redirect_uri="http://127.0.0.1:8001/authorization",
        scope=["read", "activity:read"]
    )
    return {"authorization_url": url}

@router.get("/authorization")
async def handle_authorization(code: str, state: str = None):
    """Handle Strava OAuth callback and exchange code for token"""
    client_id = os.getenv("STRAVA_CLIENT_ID")
    client_secret = os.getenv("STRAVA_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Strava credentials not configured")
    
    try:
        token_response = client.exchange_code_for_token(
            client_id=client_id,
            client_secret=client_secret,
            code=code
        )
        
        # Store tokens (in production, use a database)
        access_token = token_response["access_token"]
        refresh_token = token_response["refresh_token"]
        
        # Set the access token for future API calls
        client.access_token = access_token
        
        return {
            "message": "Authorization successful!",
            "access_token": access_token[:10] + "...",  # Only show first 10 chars for security
            "refresh_token": refresh_token[:10] + "..."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token exchange failed: {str(e)}")

@router.post("/refresh-token")
async def refresh_access_token(refresh_token: str):
    """Refresh expired access token using refresh token"""
    client_id = os.getenv("STRAVA_CLIENT_ID")
    client_secret = os.getenv("STRAVA_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Strava credentials not configured")
    
    try:
        token_response = client.refresh_access_token(
            client_id=client_id,
            client_secret=client_secret,
            refresh_token=refresh_token,
        )
        
        new_access_token = token_response["access_token"]
        new_refresh_token = token_response["refresh_token"]
        
        # Update the client with new access token
        client.access_token = new_access_token
        
        return {
            "message": "Token refreshed successfully!",
            "access_token": new_access_token[:10] + "...",
            "refresh_token": new_refresh_token[:10] + "..."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token refresh failed: {str(e)}")

def hausdorff_distance(poly1, poly2):
    """Compute symmetric Hausdorff distance between two polylines."""
    u = np.array(poly1)
    v = np.array(poly2)
    return max(directed_hausdorff(u, v)[0], directed_hausdorff(v, u)[0])

def compare_polylines(poly1, poly2, threshold_ratio=0.02):
    """
    Compare two polylines by Hausdorff distance.
    Returns True if shape difference < threshold_ratio of polyline size.
    """
    all_points = np.vstack([poly1, poly2])
    bbox_diag = np.linalg.norm(all_points.max(axis=0) - all_points.min(axis=0))

    if bbox_diag == 0:
        return False

    dist = hausdorff_distance(poly1, poly2)
    return (dist / bbox_diag) < threshold_ratio

@router.get("/", response_model=str)
async def get_map_strava(activity_id: int):
    """Get a polyline from Strava"""
    if not client.access_token:
        raise HTTPException(status_code=401, detail="Not authorized. Please complete OAuth flow first.")
    
    try:
        activity = client.get_activity(activity_id)
        polyline_str = activity.map.summary_polyline
        return polyline_str
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Strava API error: {e}")

@router.post("/compare", response_model=bool)
async def compare_map(request: CompareRequest):
    """Compare two Strava activity polylines or direct polylines by shape similarity"""
    # Check if we need Strava authorization
    if request.activity_id1 is not None and request.activity_id2 is not None:
        if not client.access_token:
            raise HTTPException(status_code=401, detail="Not authorized. Please complete OAuth flow first.")
    
    try:
        # Handle both Strava activity IDs and direct polyline input
        if request.activity_id1 is not None and request.activity_id2 is not None:
            activity1 = client.get_activity(request.activity_id1)
            activity2 = client.get_activity(request.activity_id2)

            polyline1 = polyline.decode(activity1.map.summary_polyline)
            polyline2 = polyline.decode(activity2.map.summary_polyline)
        elif request.polyline1 is not None and request.polyline2 is not None:
            polyline1 = polyline.decode(request.polyline1)
            polyline2 = polyline.decode(request.polyline2)
        else:
            raise HTTPException(status_code=400, detail="Either activity_id1/activity_id2 or polyline1/polyline2 must be provided.")

        return compare_polylines(polyline1, polyline2, request.threshold_ratio)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison error: {e}")
