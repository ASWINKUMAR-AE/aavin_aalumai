import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    APP_NAME: str = "Aavin Aalumai Shift Counter Ledger"
    APP_ENV: str = "development"
    APP_TIMEZONE: str = "Asia/Kolkata"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = Field(
        default="postgresql+psycopg2://postgres:postgrespassword@localhost:5432/aavin_ledger"
    )
    
    # JWT & Security
    JWT_SECRET_KEY: str = "aavin_aalumai_shift_ledger_dev_secret_key_32bytes"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 14
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # MinIO / Object Storage
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadminpassword"
    MINIO_BUCKET: str = "aavin-evidence"
    MINIO_SECURE: bool = False
    
    # Hash Anchoring
    HASH_ANCHOR_SIGNING_KEY: str = "aavin_tamper_evident_anchor_key_2026_ledger"
    
    # SMTP
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "ledger-alerts@aavin.tn.gov.in"
    
    # CORS
    CORS_ALLOWED_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:80",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8081",
        "exp://localhost:8081"
    ]
    
    # Counter & Plant Parameters
    COUNTER_RESET_THRESHOLD: int = 1_000_000
    RATED_HOURLY_PRODUCTION_MAX: int = 6000
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
