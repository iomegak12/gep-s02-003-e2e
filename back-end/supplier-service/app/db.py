from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

_client: AsyncIOMotorClient | None = None

def client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.MONGODB_URL)
    return _client

def db():
    return client()[settings.MONGODB_DB]

def suppliers():
    return db()["suppliers"]

async def ensure_indexes():
    col = suppliers()
    await col.create_index("supplier_code", unique=True)
    await col.create_index("status")
    await col.create_index("category")
    await col.create_index("country")
    await col.create_index([("legal_name", "text"), ("display_name", "text"), ("supplier_code", "text")])
