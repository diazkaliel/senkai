import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CartController } from '../js/components/cart.js';
import { notificationService } from '../js/services/notification_service.js?v=20261022_v2';
import { generateOrderHtmlDocument } from '../js/services/order_document_service.js';

test('cart and checkout show totals without collecting or charging for delivery', async () => {
  const storefront = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const cartDrawer = storefront.match(/<aside[^>]*id="cartDrawer"[\s\S]*?<\/aside>/)?.[0];
  const checkoutModal = storefront.match(/id="checkoutModal"[\s\S]*?<\/form>/)?.[0];

  assert.ok(cartDrawer);
  assert.ok(checkoutModal);
  assert.doesNotMatch(`${cartDrawer}${checkoutModal}`, /retiro|despacho|shipping|\$3\.990|<select\b/i);
  assert.match(checkoutModal, /coordinar la entrega/);
});

test('cart submits contact details and totals only the items', async (context) => {
  const totalLine = {};
  globalThis.document = { getElementById: (elementId) => elementId === 'checkoutTotalVal' ? totalLine : null };
  globalThis.localStorage = { getItem: () => null, removeItem: () => {} };
  const originalFetch = globalThis.fetch;
  context.mock.method(notificationService, 'success', () => {});
  context.after(() => {
    delete globalThis.document;
    delete globalThis.localStorage;
    globalThis.fetch = originalFetch;
  });

  const submittedOrders = [];
  globalThis.fetch = async (url, options) => {
    submittedOrders.push({ url, payload: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ order_number: 'SNK-QA-0001' }) };
  };

  const cart = new CartController();
  cart.items = [{ garment_id: 'polera', quantity: 1, subtotal: 12000 }];
  cart.renderCheckoutSummary();

  assert.equal(totalLine.textContent, '$12.000 CLP');

  const customerForm = new FormData();
  customerForm.set('fullName', 'Cliente de prueba');
  customerForm.set('email', 'cliente@example.com');
  customerForm.set('phone', '+56912345678');
  await cart.handleCheckoutSubmit(customerForm);
  assert.equal(submittedOrders.length, 1);
  const [submittedOrder] = submittedOrders;
  assert.equal(submittedOrder.url, '/api/v1/orders/');
  assert.deepEqual(submittedOrder.payload, {
    customer: {
      full_name: 'Cliente de prueba',
      email: 'cliente@example.com',
      phone: '+56912345678',
      notes: null
    },
    items: [{ garment_id: 'polera', quantity: 1, subtotal: 12000 }]
  });
});

test('order document distinguishes pending delivery from historical shipping', () => {
  const pending = generateOrderHtmlDocument({ customer: { delivery_method: 'pending' }, total_amount: 12000 });
  assert.match(pending, /ENTREGA POR COORDINAR/);
  assert.doesNotMatch(pending, /Costo de Despacho|Ciudad\/Comuna/);

  const shipping = generateOrderHtmlDocument({
    customer: { delivery_method: 'shipping', shipping_city: 'Providencia', shipping_address: 'Calle 123' },
    total_amount: 15990,
    shipping_cost: 3990
  });
  assert.match(shipping, /DESPACHO A PROVIDENCIA/);
  assert.match(shipping, /Calle 123/);
  assert.match(shipping, /\$3\.990/);
});
