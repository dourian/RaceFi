from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
import os
import numpy as np
import polyline
import googlemaps
import trimesh
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/dimension", tags=["dimension-mapping"])

class DimensionRequest(BaseModel):
    polyline: str

def fetch_elevation(polyline_str: str):
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GOOGLE_MAPS_API_KEY not configured")

    try:
        coords = polyline.decode(polyline_str)
        gmaps = googlemaps.Client(key=api_key)
        elevation_result = gmaps.elevation(coords)

        coords_3d = [
            [float(lat), float(lng), float(elevation_result[i]["elevation"])]
            for i, (lat, lng) in enumerate(coords)
        ]
        return coords_3d
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Elevation data error: {str(e)}")

def normalize_and_scale(coords, target_size=1.0, z_exaggeration=10.0, xy_exaggeration=100000.0):
    """Normalize coordinates and exaggerate XY and Z differences"""
    coords = np.array(coords, dtype=np.float32)
    if coords.shape[0] < 2:
        raise ValueError("Need at least 2 points to process coordinates")

    # Separate XY and Z
    xy = coords[:, :2]
    z = coords[:, 2]

    # Normalize XY
    xy -= xy.mean(axis=0)
    xy /= np.max(np.linalg.norm(xy, axis=1))
    xy *= target_size
    xy *= xy_exaggeration  # exaggerate XY differences

    # Normalize Z with extreme exaggeration
    z_range = z.max() - z.min()
    if z_range < 0.001:
        # If elevation is very flat, create dramatic artificial variations
        z += np.sin(np.linspace(0, 10*np.pi, len(z))) * 0.5
    z -= z.mean()
    z *= z_exaggeration
    
    # Add additional wave patterns to make Z variations more dramatic
    z_indices = np.arange(len(z))
    z += np.sin(z_indices * 0.5) * z_exaggeration * 0.1

    coords[:, :2] = xy
    coords[:, 2] = z
    return coords

def create_point_cloud_glb(coords):
    """Create a simple point cloud GLB from 3D coordinates"""
    coords = np.array(coords, dtype=np.float32)
    if coords.shape[0] < 2:
        raise ValueError("Need at least 2 points to create a point cloud")

    mesh = trimesh.points.PointCloud(coords)
    glb_data = mesh.export(file_type='glb')
    return glb_data

@router.post("/floating-line-model")
async def floating_line_model_endpoint(request: DimensionRequest):
    """
    Generate a 3D point cloud GLB from a polyline.
    XY differences are exaggerated by 100,000x and Z can be optionally exaggerated.
    """
    try:
        coords_3d = fetch_elevation(request.polyline)
        coords_np = np.array(coords_3d, dtype=np.float32)

        # Normalize and exaggerate
        scaled_coords = normalize_and_scale(
            coords_np,
            target_size=1.0,
            z_exaggeration=1000.0,  # Extreme Z exaggeration (same as XY)
            xy_exaggeration=100000.0
        )

        # Generate point cloud GLB
        glb_data = create_point_cloud_glb(scaled_coords)
        return Response(content=glb_data, media_type="model/gltf-binary")

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
