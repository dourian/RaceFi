from fastapi import FastAPI
from routes import map, dimension
from routes import onramp
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(
    title="RaceFi API",
    description="A FastAPI application for RaceFi",
    version="1.0.0"
)

# CORS for frontend/dev
_default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:19006",
    "http://127.0.0.1:19006",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
]
_extra_origins = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []
_origins = list({o.strip() for o in (_default_origins + _extra_origins) if o.strip()})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include route modules
app.include_router(map.router)
app.include_router(dimension.router)
app.include_router(onramp.router)

@app.get("/")
def read_root():
    return {"Hello": "World", "message": "Welcome to RaceFi API"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "RaceFi API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
