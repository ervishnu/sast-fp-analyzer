"""Routes package."""
from .configurations import router as configurations_router
from .scans import router as scans_router
from .dashboard import router as dashboard_router

__all__ = ["configurations_router", "scans_router", "dashboard_router"]
