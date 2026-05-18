import os

class Settings:
    PORT = int(os.getenv("PORT", "3002"))
    MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    MONGODB_DB = os.getenv("MONGODB_DB", "suppliers")
    JWT_SECRET = os.getenv("JWT_SECRET", "")
    JWT_ISSUER = os.getenv("JWT_ISSUER", "gep-auth")
    JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "gep-supplier")
    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

settings = Settings()
