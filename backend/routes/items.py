from fastapi import APIRouter, HTTPException
from typing import List, Optional

router = APIRouter(prefix="/items", tags=["items"])

# Mock item data
items = [
    {"id": 1, "name": "Laptop", "price": 999.99, "category": "Electronics"},
    {"id": 2, "name": "Book", "price": 19.99, "category": "Education"}
]

@router.get("/", response_model=List[dict])
async def get_items():
    """Get all items"""
    return items

@router.get("/{item_id}")
async def get_item(item_id: int, q: Optional[str] = None):
    """Get a specific item by ID with optional query parameter"""
    item = next((i for i in items if i["id"] == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    result = {"item_id": item_id, "item": item}
    if q:
        result["q"] = q
    return result

@router.post("/")
async def create_item(name: str, price: float, category: str):
    """Create a new item"""
    new_item = {
        "id": len(items) + 1,
        "name": name,
        "price": price,
        "category": category
    }
    items.append(new_item)
    return new_item
