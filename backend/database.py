from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from backend.config import config

engine = create_engine(config.DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Lease(Base):
    __tablename__ = "leases"

    id = Column(Integer, primary_key=True, index=True)
    location_name = Column(String, nullable=False, unique=True)
    location_address = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    cooperation_type = Column(String, nullable=True)
    payment_terms = Column(String, nullable=True)
    monthly_cost_amount = Column(String, nullable=True)
    security_deposit_amount = Column(String, nullable=True)
    last_invoice_due = Column(String, nullable=True)
    last_invoice_amount = Column(String, nullable=True)
    additional_info = Column(Text, nullable=True)
    status = Column(String, default="processing")
    contract_files = relationship("ContractFile", back_populates="lease")

class ContractFile(Base):
    __tablename__ = "contract_files"

    id = Column(Integer, primary_key=True, index=True)
    lease_id = Column(Integer, ForeignKey("leases.id"))
    file_url = Column(String, nullable=False)
    uploaded_at = Column(String, nullable=False)
    document_type = Column(String, nullable=False)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    cooperation_type = Column(String, nullable=True)
    payment_terms = Column(String, nullable=True)
    monthly_cost_amount = Column(String, nullable=True)
    security_deposit_amount = Column(String, nullable=True)
    last_invoice_due = Column(String, nullable=True)
    last_invoice_amount = Column(String, nullable=True)
    additional_info = Column(Text, nullable=True)
    lease = relationship("Lease", back_populates="contract_files")

Base.metadata.create_all(bind=engine)
