"""Persistent order store for the first product milestone."""
import os
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pengyn.db")
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def now():
    return datetime.now(timezone.utc)


class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    whatsapp: Mapped[str] = mapped_column(String(32))
    instagram: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    brands: Mapped[list["Brand"]] = relationship(back_populates="customer")


class Brand(Base):
    __tablename__ = "brands"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    niche: Mapped[str] = mapped_column(String(200))
    instagram: Mapped[str | None] = mapped_column(String(100), nullable=True)
    customer: Mapped[Customer] = relationship(back_populates="brands")


class Campaign(Base):
    __tablename__ = "campaigns"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    brand_id: Mapped[str] = mapped_column(ForeignKey("brands.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    style: Mapped[str] = mapped_column(String(100))
    goal: Mapped[str] = mapped_column(String(500), default="")
    titles: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(32), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id"), index=True)
    transaction_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer)
    amount_cents: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


def init_db():
    Base.metadata.create_all(engine)


def record_checkout(order_data: dict, transaction_id: str) -> str:
    from sqlalchemy import select
    init_db()
    client, config, purchase = order_data["client"], order_data["config"], order_data["purchase"]
    with SessionLocal.begin() as db:
        customer = db.scalar(select(Customer).where(Customer.email == client["email"]))
        if customer is None:
            customer = Customer(email=client["email"], whatsapp=client["whatsapp"], instagram=client["instagram"])
            db.add(customer)
            db.flush()
        brand = Brand(customer_id=customer.id, name=config["niche"], niche=config["niche"], instagram=client["instagram"])
        db.add(brand)
        db.flush()
        campaign = Campaign(brand_id=brand.id, title=config["title"], style=config["style"], goal=config["goal"], titles=config["titles"], status="awaiting_payment")
        db.add(campaign)
        db.flush()
        amount_cents = int(purchase["price"].replace("R$", "").strip().replace(",", ""))
        order = Order(campaign_id=campaign.id, transaction_id=transaction_id, quantity=int(purchase["quantity"]), amount_cents=amount_cents)
        db.add(order)
        db.flush()
        return order.id


def get_order(order_id: str):
    init_db()
    with SessionLocal() as db:
        order = db.get(Order, order_id)
        if order is None:
            return None
        campaign = db.get(Campaign, order.campaign_id)
        brand = db.get(Brand, campaign.brand_id)
        return {"id": order.id, "status": order.status, "quantity": order.quantity, "amount_cents": order.amount_cents, "transaction_id": order.transaction_id, "campaign": {"id": campaign.id, "title": campaign.title, "style": campaign.style, "goal": campaign.goal, "status": campaign.status, "brand_id": brand.id}}


def update_order(transaction_id: str, order_status: str, campaign_status: str):
    from sqlalchemy import select
    with SessionLocal.begin() as db:
        order = db.scalar(select(Order).where(Order.transaction_id == transaction_id))
        if order is not None:
            order.status = order_status
            db.get(Campaign, order.campaign_id).status = campaign_status

class GenerationJob(Base):
    __tablename__ = "generation_jobs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id"), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Asset(Base):
    __tablename__ = "assets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(200))
    caption: Mapped[str] = mapped_column(String(2000), default="")
    visual_prompt: Mapped[str] = mapped_column(String(2000), default="")
    image_url: Mapped[str] = mapped_column(String(1000))


def queue_paid_order(transaction_id: str):
    """Only the verified payment adapter (or local demo) should call this."""
    from sqlalchemy import select
    init_db()
    with SessionLocal.begin() as db:
        order = db.scalar(select(Order).where(Order.transaction_id == transaction_id))
        if order is None:
            return None
        job = db.scalar(select(GenerationJob).where(GenerationJob.order_id == order.id))
        if job is None:
            job = GenerationJob(order_id=order.id)
            db.add(job)
        order.status = "paid"
        db.get(Campaign, order.campaign_id).status = "queued"
        return order.id


def claim_job():
    """PostgreSQL row lock prevents two workers from claiming the same job."""
    from sqlalchemy import select
    init_db()
    with SessionLocal.begin() as db:
        query = select(GenerationJob).where(GenerationJob.status == "pending").order_by(GenerationJob.created_at).limit(1)
        if not DATABASE_URL.startswith("sqlite"):
            query = query.with_for_update(skip_locked=True)
        job = db.scalar(query)
        if job is None:
            return None
        job.status = "running"
        job.attempts += 1
        order = db.get(Order, job.order_id)
        campaign = db.get(Campaign, order.campaign_id)
        brand = db.get(Brand, campaign.brand_id)
        campaign.status = "generating"
        return {"job_id": job.id, "order_id": order.id, "campaign_id": campaign.id, "niche": brand.niche, "style": campaign.style, "title": campaign.title, "goal": campaign.goal, "titles": campaign.titles, "quantity": order.quantity}


def complete_job(job_id: str, posts: list[dict]):
    with SessionLocal.begin() as db:
        job = db.get(GenerationJob, job_id)
        order = db.get(Order, job.order_id)
        campaign = db.get(Campaign, order.campaign_id)
        for position, post in enumerate(posts):
            db.add(Asset(campaign_id=campaign.id, position=position, **post))
        job.status = "completed"
        campaign.status = "ready"


def fail_job(job_id: str, message: str):
    with SessionLocal.begin() as db:
        job = db.get(GenerationJob, job_id)
        job.status = "failed"
        job.error = message[:500]
        order = db.get(Order, job.order_id)
        db.get(Campaign, order.campaign_id).status = "failed"


def get_delivery(order_id: str):
    from sqlalchemy import select
    init_db()
    with SessionLocal() as db:
        order = db.get(Order, order_id)
        if order is None:
            return None
        campaign = db.get(Campaign, order.campaign_id)
        assets = db.scalars(select(Asset).where(Asset.campaign_id == campaign.id).order_by(Asset.position)).all()
        job = db.scalar(select(GenerationJob).where(GenerationJob.order_id == order_id))
        return {"order_id": order_id, "status": campaign.status, "images": [{"title": asset.title, "caption": asset.caption, "image_url": asset.image_url} for asset in assets], "error": job.error if job and job.status == "failed" else None}


def get_order_by_transaction_id(transaction_id: str):
    from sqlalchemy import select
    with SessionLocal() as db:
        order = db.scalar(select(Order).where(Order.transaction_id == transaction_id))
        return order.id if order else None
