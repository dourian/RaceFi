from fastapi import FastAPI
from routes import challenge, participants, runs, tracks, map, dimension

app = FastAPI(
    title="RaceFi API",
    description="A FastAPI application for RaceFi",
    version="1.0.0"
)

# Include route modules
app.include_router(challenge.router)
app.include_router(participants.router)
app.include_router(runs.router)
app.include_router(tracks.router)
app.include_router(map.router)
app.include_router(dimension.router)

@app.get("/")
def read_root():
    return {"Hello": "World", "message": "Welcome to RaceFi API"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "RaceFi API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)