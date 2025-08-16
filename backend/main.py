from fastapi import FastAPI
from routes import users, items

app = FastAPI(
    title="RaceFi API",
    description="A FastAPI application for RaceFi",
    version="1.0.0"
)

# Include route modules
app.include_router(users.router)
app.include_router(items.router)

@app.get("/")
def read_root():
    return {"Hello": "World", "message": "Welcome to RaceFi API"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "RaceFi API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)