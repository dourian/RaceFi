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

def create_point_cloud_glb(coords, density_factor=3000, tail_points=20, tail_length=0.5):
    """Create a dense point cloud GLB with interpolated points and vertical tails"""
    coords = np.array(coords, dtype=np.float32)
    if coords.shape[0] < 2:
        raise ValueError("Need at least 2 points to create a point cloud")
    
    # Interpolate points to create a much denser point cloud
    dense_coords = []
    for i in range(len(coords) - 1):
        p1 = coords[i]
        p2 = coords[i + 1]
        
        # Add the first point
        dense_coords.append(p1)
        
        # Add very long vertical tail going straight down from this point
        for j in range(1, tail_points + 1):
            # Create points with same X,Y but dramatically decreasing Z
            tail_point = p1.copy()
            # Use exponential decrease to make tail points more visible near the start
            decrease_factor = (j / tail_points) ** 0.7  # Less than 1 power makes more points near the start
            tail_point[2] -= decrease_factor * tail_length
            dense_coords.append(tail_point)
            
            # Add many more points around each tail point to make it more visible
            offset = tail_length * 0.001  # Small offset
            
            # Create a denser pattern of points around each tail point
            for dx in [-offset*2, -offset, 0, offset, offset*2]:
                for dy in [-offset*2, -offset, 0, offset, offset*2]:
                    # Skip the center point (already added)
                    if dx == 0 and dy == 0:
                        continue
                    
                    extra_point = tail_point.copy()
                    extra_point[0] += dx
                    extra_point[1] += dy
                    dense_coords.append(extra_point)
        
        # Add many interpolated points between p1 and p2
        for j in range(1, density_factor):
            t = j / density_factor
            interp_point = p1 * (1 - t) + p2 * t
            dense_coords.append(interp_point)
    
    # Add the last point
    if len(coords) > 0:
        last_point = coords[-1]
        dense_coords.append(last_point)
        
        # Add very long vertical tail for the last point
        for j in range(1, tail_points + 1):
            # Create points with same X,Y but dramatically decreasing Z
            tail_point = last_point.copy()
            # Use exponential decrease to make tail points more visible near the start
            decrease_factor = (j / tail_points) ** 0.7  # Less than 1 power makes more points near the start
            tail_point[2] -= decrease_factor * tail_length
            dense_coords.append(tail_point)
            
            # Add many more points around each tail point to make it more visible
            offset = tail_length * 0.001  # Small offset
            
            # Create a denser pattern of points around each tail point
            for dx in [-offset*2, -offset, 0, offset, offset*2]:
                for dy in [-offset*2, -offset, 0, offset, offset*2]:
                    # Skip the center point (already added)
                    if dx == 0 and dy == 0:
                        continue
                    
                    extra_point = tail_point.copy()
                    extra_point[0] += dx
                    extra_point[1] += dy
                    dense_coords.append(extra_point)
    
    # Convert to numpy array
    dense_coords = np.array(dense_coords, dtype=np.float32)
    print(f"Original points: {len(coords)}, Dense points with tails: {len(dense_coords)}")
    
    # Create a point cloud mesh with the dense points including tails
    mesh = trimesh.points.PointCloud(dense_coords)
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
            z_exaggeration=3000.0,  # Extreme Z exaggeration (same as XY)
            xy_exaggeration=100000.0
        )

        # Generate point cloud GLB with ultra-dense tails
        glb_data = create_point_cloud_glb(
            scaled_coords, 
            density_factor=20,     # Moderate density between points
            tail_points=300,       # 300 points per tail for extremely dense tails
            tail_length=100000.0   # Extremely long tails matching the XY exaggeration scale
        )
        return Response(content=glb_data, media_type="model/gltf-binary")

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
