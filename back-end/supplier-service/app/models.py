from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field

Category = Literal[
    "RAW_MATERIALS", "PACKAGING", "LOGISTICS", "IT_SERVICES",
    "PROFESSIONAL_SERVICES", "MRO", "CAPEX", "OTHER",
]
PaymentTerms = Literal[
    "NET_15", "NET_30", "NET_45", "NET_60", "NET_90", "IMMEDIATE", "ADVANCE_50_50",
]
Status = Literal["PENDING_APPROVAL", "ACTIVE", "INACTIVE", "BLACKLISTED"]

class Contact(BaseModel):
    primary_name: str
    email: EmailStr
    phone: str

class Address(BaseModel):
    street: str
    city: str
    state: str
    country: str
    postal_code: str

class Certification(BaseModel):
    name: str
    issued_by: str
    valid_until: str

class SupplierCreate(BaseModel):
    supplier_code: str
    legal_name: str
    display_name: str
    category: Category
    sub_category: Optional[str] = None
    country: str
    region: Optional[str] = None
    tax_id: Optional[str] = None
    contact: Contact
    address: Address
    payment_terms: PaymentTerms
    currency: str
    certifications: list[Certification] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)

class SupplierUpdate(BaseModel):
    legal_name: Optional[str] = None
    display_name: Optional[str] = None
    category: Optional[Category] = None
    sub_category: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    tax_id: Optional[str] = None
    contact: Optional[Contact] = None
    address: Optional[Address] = None
    payment_terms: Optional[PaymentTerms] = None
    currency: Optional[str] = None
    certifications: Optional[list[Certification]] = None
    tags: Optional[list[str]] = None
    rating: Optional[float] = None

class Supplier(BaseModel):
    id: str
    supplier_code: str
    legal_name: str
    display_name: str
    category: Category
    sub_category: Optional[str] = None
    country: str
    region: Optional[str] = None
    tax_id: Optional[str] = None
    contact: Contact
    address: Address
    payment_terms: PaymentTerms
    currency: str
    status: Status
    blacklist_reason: Optional[str] = None
    certifications: list[Certification] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    rating: float = 0.0
    on_time_delivery_rate: float = 0.0
    total_orders_count: int = 0
    total_spend_inr: float = 0.0
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

class ReasonBody(BaseModel):
    reason: str
