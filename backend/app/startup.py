"""Startup tasks: make sure the admin account and system password exist,
and (in demo mode) fill an empty database with sample data."""
import logging
from datetime import datetime

from app.core.config import settings
from app.core.security import get_password_hash
from app.crud import user as crud_user
from app.db.base import SessionLocal
from app.models.blocker import Blocker, BlockerLog
from app.models.product import Product, ProductLog
from app.models.system_password import SystemPassword

logger = logging.getLogger(__name__)

DEMO_BLOCKERS = [
    {"name": "CNQX", "units": 3, "storage": "Freezer", "location": "Freezer A, Box 2",
     "function": "AMPA/kainate receptor antagonist", "notes": "Demo record"},
    {"name": "D-AP5", "units": 2, "storage": "Freezer", "location": "Freezer A, Box 2",
     "function": "NMDA receptor antagonist", "notes": "Demo record"},
    {"name": "Picrotoxin", "units": 1, "storage": "Shelf", "location": "Shelf 3",
     "function": "GABA-A receptor antagonist", "notes": "Demo record"},
    {"name": "Tetrodotoxin (TTX)", "units": 1, "storage": "Freezer", "location": "Locked freezer",
     "function": "Voltage-gated sodium channel blocker", "notes": "Demo record"},
]


def ensure_admin_and_system_password() -> None:
    db = SessionLocal()
    try:
        if not crud_user.get_user_by_username(db, "admin"):
            crud_user.create_user(db, {
                "email": "admin@lims.com",
                "username": "admin",
                "full_name": "Admin User",
                "role": "super_admin",
                "password": settings.ADMIN_PASSWORD,
            })
            logger.info("Admin user created")

        system_password = db.query(SystemPassword).first()
        new_hash = get_password_hash(settings.SYSTEM_PASSWORD)
        if not system_password:
            db.add(SystemPassword(password_hash=new_hash))
        else:
            # Keep the stored system password in sync with the environment variable
            system_password.password_hash = new_hash
        db.commit()
    except Exception:
        logger.exception("Failed to ensure admin user / system password")
        db.rollback()
    finally:
        db.close()


def seed_demo_data() -> None:
    if not settings.DEMO_SEED:
        return
    db = SessionLocal()
    try:
        if db.query(Product).count() > 0:
            return
        admin = crud_user.get_user_by_username(db, "admin")
        admin_id = admin.id if admin else None

        from insert_sample_products import PRODUCTS_DATA  # sample lab orders

        for item in PRODUCTS_DATA:
            data = dict(item)
            if data.get("order_date"):
                data["order_date"] = datetime.strptime(data["order_date"], "%Y-%m-%d")
            else:
                data["order_date"] = None
            product = Product(**data, created_by_id=admin_id)
            db.add(product)
            db.flush()
            db.add(ProductLog(product_id=product.id, log_type="creation",
                              new_value=f"Product '{product.name}' created",
                              created_by_id=admin_id))

        for item in DEMO_BLOCKERS:
            blocker = Blocker(**item, created_by_id=admin_id)
            db.add(blocker)
            db.flush()
            db.add(BlockerLog(blocker_id=blocker.id, log_type="creation",
                              new_value=f"Blocker '{blocker.name}' created",
                              created_by_id=admin_id))
        db.commit()
        logger.info("Demo data seeded: %d products, %d blockers",
                    len(PRODUCTS_DATA), len(DEMO_BLOCKERS))
    except Exception:
        logger.exception("Demo seed failed")
        db.rollback()
    finally:
        db.close()
