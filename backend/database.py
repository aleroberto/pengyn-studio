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
