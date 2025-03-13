from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import fitz
import pytesseract
from pdf2image import convert_from_path
from backend.ml_model import extract_lease_info
from backend.utils import upload_pdf_to_s3
from backend.database import SessionLocal, Lease, ContractFile
from sqlalchemy.orm import Session
import json
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change "*" to your frontend URL if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OCR + PDF Processing Functions
def has_selectable_text(pdf_path: str) -> bool:
    doc = fitz.open(pdf_path)
    for page in doc:
        if page.get_text().strip():
            return True
    return False

def extract_text_with_pymupdf(pdf_path: str) -> str:
    doc = fitz.open(pdf_path)
    return "\n".join([page.get_text() for page in doc])

def extract_text_from_image_pdf(pdf_path: str) -> str:
    images = convert_from_path(pdf_path)  # Ensure high DPI

    if not images:
        print("PDF conversion failed: No images extracted!")

    text = "\n".join([pytesseract.image_to_string(img, config="--psm 6") for img in images])
    return text

def extract_pdf_text(pdf_path: str) -> str:
    return extract_text_with_pymupdf(pdf_path) if has_selectable_text(pdf_path) else extract_text_from_image_pdf(pdf_path)

def extract_lease_information(text, saved_locations):
    lease_data = extract_lease_info(text, saved_locations)

    return lease_data

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/contracts")
def get_contracts(db: Session = Depends(get_db)):
    leases = db.query(Lease).all()
    response = []

    for lease in leases:
        contract_files = (
            db.query(ContractFile)
            .filter(ContractFile.lease_id == lease.id)
            .order_by(ContractFile.uploaded_at.desc())
            .all()
        )
        response.append({
            "location_name": lease.location_name,
            "location_address": lease.location_address,
            "start_date": lease.start_date,
            "end_date": lease.end_date,
            "cooperation_type": lease.cooperation_type,
            "payment_terms": lease.payment_terms,
            "monthly_cost_amount": lease.monthly_cost_amount,
            "security_deposit_amount": lease.security_deposit_amount,
            "last_invoice_due": lease.last_invoice_due,
            "last_invoice_amount": lease.last_invoice_amount,
            "additional_info": json.loads(lease.additional_info) if lease.additional_info else {},
            "status": lease.status,
            "contract_files": [
                {
                    "file_url": f.file_url,
                    "document_type": f.document_type,
                    "uploaded_at": f.uploaded_at,
                    "start_date": f.start_date,
                    "end_date": f.end_date,
                    "cooperation_type": f.cooperation_type,
                    "payment_terms": f.payment_terms,
                    "monthly_cost_amount": f.monthly_cost_amount,
                    "security_deposit_amount": f.security_deposit_amount,
                    "last_invoice_due": f.last_invoice_due,
                    "last_invoice_amount": f.last_invoice_amount,
                    "additional_info": json.loads(f.additional_info) if f.additional_info else {},
                } for f in contract_files
            ]
        })

    return {"data": response}

def process_lease_file(pdf_bytes, file, lease_id):
    db = SessionLocal()

    try:
        # Extract text from the uploaded PDF
        temp_path = f"temp_{file.filename}.pdf"
        with open(temp_path, "wb") as buffer:
            buffer.write(pdf_bytes)

        file_url = upload_pdf_to_s3(pdf_bytes, file.filename)

        try:
            text = extract_pdf_text(temp_path)
        finally:
            os.remove(temp_path)

        # Extract lease details using AI
        saved_locations = [lease.location_name for lease in db.query(Lease.location_name).filter(Lease.status == 'completed').all()]
        lease_info = extract_lease_information(text, saved_locations)
        additional_info = lease_info.get("additional_info", {})

        location_name = lease_info["location_name"]
        contract_date = datetime.strptime(lease_info["document_date"], "%Y-%m-%d")

        # Fetch existing lease & current lease
        existing_lease = db.query(Lease).filter(Lease.location_name == location_name).first()
        current_lease = db.query(Lease).filter(Lease.id == lease_id).first()

        last_contract_date = None

        if existing_lease:
            # Get latest contract file for date comparison
            latest_contract_file = (
                db.query(ContractFile)
                .filter(ContractFile.lease_id == existing_lease.id)
                .order_by(ContractFile.uploaded_at.desc())
                .first()
            )
            if latest_contract_file:
                last_contract_date = datetime.fromisoformat(latest_contract_file.uploaded_at)

            # If the new contract is more recent, update lease details
            if last_contract_date is None or contract_date > last_contract_date:
                if lease_info["document_type"] != "invoice":
                    existing_lease.location_address = lease_info["location_address"]
                    existing_lease.start_date = lease_info["start_date"]
                    existing_lease.end_date = lease_info["end_date"]
                    existing_lease.cooperation_type = lease_info["cooperation_type"]
                    existing_lease.payment_terms = lease_info["payment_terms"]
                    existing_lease.monthly_cost_amount = lease_info["monthly_cost_amount"]
                    existing_lease.security_deposit_amount = lease_info["security_deposit_amount"]
                    existing_lease.additional_info = json.dumps(additional_info)

                existing_lease.last_invoice_due = lease_info["last_invoice_due"]
                existing_lease.last_invoice_amount = lease_info["last_invoice_amount"]
                existing_lease.status = "completed"

            if current_lease:
                current_lease.status = "mapped"

        else:
            # If it's a new location, update `current_lease`
            if current_lease:
                current_lease.location_name = lease_info["location_name"]
                current_lease.location_address = lease_info["location_address"]
                current_lease.start_date = lease_info["start_date"]
                current_lease.end_date = lease_info["end_date"]
                current_lease.cooperation_type = lease_info["cooperation_type"]
                current_lease.payment_terms = lease_info["payment_terms"]
                current_lease.monthly_cost_amount = lease_info["monthly_cost_amount"]
                current_lease.security_deposit_amount = lease_info["security_deposit_amount"]
                current_lease.last_invoice_due = lease_info["last_invoice_due"]
                current_lease.last_invoice_amount = lease_info["last_invoice_amount"]
                current_lease.additional_info = json.dumps(additional_info)
                current_lease.status = "completed"

        # Save the contract file entry
        contract_file = ContractFile(
            lease_id=existing_lease.id if existing_lease else lease_id,  # If existing lease, use its ID
            file_url=file_url,
            document_type=lease_info["document_type"],
            uploaded_at=contract_date.isoformat(),
            start_date = lease_info["start_date"],
            end_date = lease_info["end_date"],
            cooperation_type = lease_info["cooperation_type"],
            payment_terms = lease_info["payment_terms"],
            monthly_cost_amount = lease_info["monthly_cost_amount"],
            security_deposit_amount = lease_info["security_deposit_amount"],
            last_invoice_due = lease_info["last_invoice_due"],
            last_invoice_amount = lease_info["last_invoice_amount"],
            additional_info = json.dumps(additional_info)
        )
        db.add(contract_file)
        db.commit()

    except Exception as e:
        print(f"Error processing lease file: {e}")
        db.rollback()  # Prevents corrupt database state
        if current_lease:
            current_lease.status = "failed"
            db.commit()
    finally:
        db.close()


@app.post("/upload")
async def upload_pdf(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    db = SessionLocal()
    try:
        pdf_bytes = await file.read()
        if not pdf_bytes:
            print("Error: File is empty")
            return {"error": "Failed to read file, file is empty"}

        lease = Lease(location_name=file.filename, status="processing")
        db.add(lease)
        db.commit()

        lease_id = lease.id

        background_tasks.add_task(process_lease_file, pdf_bytes, file, lease_id)

        return {"status": "success", "lease_id": lease_id}
    except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    finally:
        print("closing db")
        db.close()

@app.get("/contracts/{lease_id}")
def get_contract_status(lease_id: int):
    db = SessionLocal()
    try:
        leases = db.query(Lease).all()        

        lease = db.query(Lease).filter(Lease.id == lease_id).first()
        if lease:
            if lease.status == "mapped":
                db.delete(lease)
                db.commit()
                return {"status": "completed"}
            else:
                return {"status": lease.status}
        return {"status": "not found"}
    finally:
        db.close()
