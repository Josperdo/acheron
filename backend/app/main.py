from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import settings

app = FastAPI(title="Acheron", description="Entra ID attack path visualizer (read-only)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(router)
