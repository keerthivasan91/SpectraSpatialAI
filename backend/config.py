from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    # MySQL
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "password"
    MYSQL_DB: str = "spectra_spatial"

    # Paths
    MODEL_PATH: str = "weights/model.pt"
    UPLOAD_DIR: str = "uploads"
    FEEDBACK_DIR: str = "feedback_samples"

    # Model
    IMAGE_SIZE: int = 256

    # Admin — only this token can access /retrain endpoints
    ADMIN_TOKEN: str = "ADMIN_TOKEN"

    # App
    ALLOWED_ORIGINS: list = ["http://localhost:5173"]

    class Config:
        env_file = ".env"

settings = Settings()
