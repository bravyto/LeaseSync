import boto3
import uuid
from backend.config import config

s3_client = boto3.client(
    "s3",
    aws_access_key_id=config.AWS_ACCESS_KEY,
    aws_secret_access_key=config.AWS_SECRET_KEY,
    region_name=config.AWS_S3_REGION,
)

def upload_pdf_to_s3(file_data, filename):
    """Uploads a PDF to AWS S3 and returns the file URL."""
    unique_filename = f"{uuid.uuid4()}_{filename}"

    """todo: store in private and load presigned url each time frontend load file"""
    s3_client.put_object(
        Bucket=config.AWS_S3_BUCKET,
        Key=unique_filename,
        Body=file_data,
        ContentType="application/pdf",
        ACL="public-read",
    )

    file_url = f"https://{config.AWS_S3_BUCKET}.s3.{config.AWS_S3_REGION}.amazonaws.com/{unique_filename}"
    return file_url
