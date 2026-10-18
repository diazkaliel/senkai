"""initial_relational_schema

Revision ID: e67d9df8f6ed
Revises: 
Create Date: 2026-09-13 22:55:04.938471

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e67d9df8f6ed'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tabla garments
    op.create_table(
        'garments',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('category', sa.String(length=40), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('weight_gsm', sa.Integer(), nullable=False),
        sa.Column('composition', sa.String(length=120), nullable=False, server_default='100% Algodón Peinado'),
        sa.Column('base_price', sa.Integer(), nullable=False),
        sa.Column('image_front_template', sa.String(length=255), nullable=False),
        sa.Column('image_back_template', sa.String(length=255), nullable=False),
        sa.Column('photo_front', sa.String(length=255), nullable=True),
        sa.Column('photo_back', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index('ix_garments_id', 'garments', ['id'])
    op.create_index('ix_garments_category', 'garments', ['category'])
    op.create_index('ix_garments_is_active', 'garments', ['is_active'])

    # 2. Tabla garment_variants
    op.create_table(
        'garment_variants',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('garment_id', sa.String(length=64), sa.ForeignKey('garments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('color_name', sa.String(length=60), nullable=False),
        sa.Column('color_hex', sa.String(length=10), nullable=False),
        sa.Column('size', sa.String(length=10), nullable=False),
        sa.Column('stock_quantity', sa.Integer(), nullable=False, server_default='50'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index('ix_garment_variants_id', 'garment_variants', ['id'])
    op.create_index('ix_garment_variants_garment_id', 'garment_variants', ['garment_id'])
    op.create_index('ix_garment_variants_size', 'garment_variants', ['size'])

    # 3. Tabla workshop_orders
    op.create_table(
        'workshop_orders',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('order_number', sa.String(length=32), nullable=False, unique=True),
        sa.Column('customer_name', sa.String(length=120), nullable=False),
        sa.Column('customer_email', sa.String(length=150), nullable=False),
        sa.Column('customer_phone', sa.String(length=40), nullable=False),
        sa.Column('delivery_method', sa.String(length=20), nullable=False),
        sa.Column('shipping_address', sa.String(length=255), nullable=True),
        sa.Column('shipping_city', sa.String(length=100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('total_amount', sa.Integer(), nullable=False),
        sa.Column('shipping_cost', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=40), nullable=False, server_default='cola_impresion_dtf'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('estimated_delivery', sa.String(length=20), nullable=False),
        sa.Column('tracking_code', sa.String(length=80), nullable=True),
        sa.Column('items_payload', sa.Text(), nullable=False),
    )
    op.create_index('ix_workshop_orders_id', 'workshop_orders', ['id'])
    op.create_index('ix_workshop_orders_order_number', 'workshop_orders', ['order_number'])
    op.create_index('ix_workshop_orders_customer_email', 'workshop_orders', ['customer_email'])
    op.create_index('ix_workshop_orders_status', 'workshop_orders', ['status'])

    # 4. Tabla order_items
    op.create_table(
        'order_items',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('order_id', sa.String(length=36), sa.ForeignKey('workshop_orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column('garment_id', sa.String(length=64), nullable=False),
        sa.Column('garment_name', sa.String(length=120), nullable=False),
        sa.Column('selected_color_name', sa.String(length=60), nullable=False),
        sa.Column('selected_color_hex', sa.String(length=10), nullable=False),
        sa.Column('selected_size', sa.String(length=10), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Integer(), nullable=False),
        sa.Column('subtotal', sa.Integer(), nullable=False),
        sa.Column('prints_payload', sa.Text(), nullable=False, server_default='[]'),
    )
    op.create_index('ix_order_items_order_id', 'order_items', ['order_id'])

    # 5. Tabla idempotency_records
    op.create_table(
        'idempotency_records',
        sa.Column('key', sa.String(length=128), primary_key=True),
        sa.Column('request_hash', sa.String(length=64), nullable=False),
        sa.Column('response_payload', sa.Text(), nullable=False),
        sa.Column('status_code', sa.Integer(), nullable=False, server_default='201'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_idempotency_records_key', 'idempotency_records', ['key'])

    # 6. Tabla site_sections_content
    op.create_table(
        'site_sections_content',
        sa.Column('section_key', sa.String(length=50), primary_key=True),
        sa.Column('payload_json', sa.Text(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_site_sections_content_section_key', 'site_sections_content', ['section_key'])


def downgrade() -> None:
    op.drop_table('site_sections_content')
    op.drop_table('idempotency_records')
    op.drop_table('order_items')
    op.drop_table('workshop_orders')
    op.drop_table('garment_variants')
    op.drop_table('garments')
