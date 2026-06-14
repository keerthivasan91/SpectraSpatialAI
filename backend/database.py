from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
from config import settings

DATABASE_URL = (
    f"mysql+pymysql://{settings.MYSQL_USER}:{settings.MYSQL_PASSWORD}"
    f"@{settings.MYSQL_HOST}:{settings.MYSQL_PORT}/{settings.MYSQL_DB}"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Prediction(Base):
    __tablename__ = "predictions"
    id             = Column(Integer, primary_key=True, index=True)
    filename       = Column(String(255))
    filepath       = Column(String(512))
    label          = Column(String(50))         # model's prediction
    confidence     = Column(Float)
    is_wrong       = Column(Boolean, default=False)
    correct_label  = Column(String(50), nullable=True)
    # Admin review state: NULL=unreviewed, TRUE=approved, FALSE=rejected
    admin_approved = Column(Boolean, nullable=True, default=None)
    retrained      = Column(Boolean, default=False)
    created_at     = Column(DateTime, default=datetime.utcnow)


class RetrainJob(Base):
    __tablename__ = "retrain_jobs"
    id              = Column(Integer, primary_key=True, index=True)
    status          = Column(String(50), default="pending")
    num_samples     = Column(Integer, default=0)
    accuracy_before = Column(Float, nullable=True)
    accuracy_after  = Column(Float, nullable=True)
    log             = Column(Text, nullable=True)
    started_at      = Column(DateTime, nullable=True)
    finished_at     = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
