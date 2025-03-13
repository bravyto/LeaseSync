import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
    AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
    AWS_S3_REGION = os.getenv("AWS_S3_REGION")
    AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")
    AWS_BEDROCK_REGION = os.getenv("AWS_BEDROCK_REGION")
    AWS_BEDROCK_MODEL_ID = os.getenv("AWS_BEDROCK_MODEL_ID")
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./leases.db")

config = Config()
