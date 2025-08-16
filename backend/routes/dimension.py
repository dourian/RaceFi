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

def add_tail_to_point(point, dense_coords, tail_points, min_z_level, grid_size=9):
    """Helper function to add a vertical tail from the point down to min_z_level"""
    # Tails start at the actual point and go down to min_z_level
    total_tail_length = point[2] - min_z_level
    
    # Keep the original X,Y but create a tail from the point down to min_z_level
    for j in range(1, tail_points + 1):  # Start from 1 to avoid duplicating the point
        # Create points with same X,Y but Z ranging from point to min
        tail_point = point.copy()
        # Calculate Z position along the tail
        z_factor = j / tail_points
        tail_point[2] = point[2] - (z_factor * total_tail_length)
        dense_coords.append(tail_point)
        
        # Add more points around each tail point to make it more visible
        offset = total_tail_length * 0.001  # Offset relative to tail length
        
        # Create an ultra-dense grid of points around each tail point
        # Only add these for every few points to avoid too many points
        if j % 3 == 0:  # Every 3rd point gets a grid
            half_grid = grid_size // 2
            for dx_idx in range(grid_size):
                for dy_idx in range(grid_size):
                    # Calculate offsets to create a grid centered on the tail point
                    dx = offset * (dx_idx - half_grid)
                    dy = offset * (dy_idx - half_grid)
                    
                    # Skip the center point (already added)
                    if dx == 0 and dy == 0:
                        continue
                    
                    # Add grid point
                    extra_point = tail_point.copy()
                    extra_point[0] += dx
                    extra_point[1] += dy
                    dense_coords.append(extra_point)

def create_point_cloud_glb(coords, density_factor=20, tail_points=500, interp_tail_interval=1):
    """Create an EXTREMELY dense point cloud GLB with vertical tails going down from each point"""
    coords = np.array(coords, dtype=np.float32)
    if coords.shape[0] < 2:
        raise ValueError("Need at least 2 points to create a point cloud")
    
    # Calculate minimum Z level for all tails
    min_z_level = np.min(coords[:, 2]) - 1000.0  # 1,000 units below the lowest point
    
    # Interpolate points to create a much denser point cloud
    dense_coords = []
    for i in range(len(coords) - 1):
        p1 = coords[i]
        p2 = coords[i + 1]
        
        # Add the first point
        dense_coords.append(p1)
        
        # Add tail going down from the original point
        add_tail_to_point(p1, dense_coords, tail_points, min_z_level, grid_size=9)
        
        # Add many interpolated points between p1 and p2
        for j in range(1, density_factor):
            t = j / density_factor
            interp_point = p1 * (1 - t) + p2 * t
            dense_coords.append(interp_point)
            
            # Add tails to ALL interpolated points
            if j % interp_tail_interval == 0:  # Every nth interpolated point
                add_tail_to_point(interp_point, dense_coords, tail_points // 2, min_z_level, grid_size=7)
    
    # Add the last point
    if len(coords) > 0:
        last_point = coords[-1]
        dense_coords.append(last_point)
        
        # Add tail to the last point
        add_tail_to_point(last_point, dense_coords, tail_points, min_z_level, grid_size=9)
    
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

        # Normalize and exaggerate XY much more than Z
        scaled_coords = normalize_and_scale(
            coords_np,
            target_size=1.0,
            z_exaggeration=2000.0,   # Much lower Z exaggeration to make tails longer relative to height
            xy_exaggeration=100000.0
        )

        # Generate point cloud GLB with dense tails for ALL points
        glb_data = create_point_cloud_glb(
            scaled_coords, 
            density_factor=5,       # Fewer interpolated points to balance with tails
            tail_points=50,         # 50 points per tail for shorter tails
            interp_tail_interval=1  # Add tails to EVERY interpolated point
        )
        return Response(content=glb_data, media_type="model/gltf-binary")

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")