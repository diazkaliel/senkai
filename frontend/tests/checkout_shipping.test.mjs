import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CartController } from '../js/components/cart.js';
import { notificationService } from '../js/services/notification_service.js?v=20261022_v2';

test('checkout requires a shipping address and has no fulfillment selector', async () => {
  const storefront = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const checkoutForm = storefront.match(/<form id="checkoutForm">[\s\S]*?<\/form>/)?.[0];

  assert.ok(checkoutForm);
  assert.doesNotMatch(checkoutForm, /<select\b/);
  assert.match(checkoutForm, /<input[^>]*name="shippingAddress"[^>]*\brequired\b/);
  assert.match(checkoutForm, /<input[^>]*name="shippingCity"[^>]*\brequired\b/);
});

test('cart sends home delivery at the same price shown in the order summary', async (context) => {
  const shippingLine = {};
  const totalLine = {};
  const pageElements = new Map([
    ['checkoutShippingVal', shippingLine],
    ['checkoutTotalVal', totalLine]
  ]);
  globalThis.document = { getElementById: (elementId) => pageElements.get(elementId) ?? null };
  globalThis.localStorage = { getItem: () => null, removeItem: () => {} };
  const originalFetch = globalThis.fetch;
  const notifyIncompleteAddress = context.mock.method(notificationService, 'warning', () => {});
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

  assert.equal(shippingLine.textContent, '$3.990 CLP');
  assert.equal(totalLine.textContent, '$15.990 CLP');

  const customerForm = new FormData();
  customerForm.set('fullName', 'Cliente de prueba');
  customerForm.set('email', 'cliente@example.com');
  customerForm.set('phone', '+56912345678');
  customerForm.set('shippingAddress', '  Calle de prueba 123  ');
  customerForm.set('shippingCity', '   ');

  await cart.handleCheckoutSubmit(customerForm);
  assert.equal(notifyIncompleteAddress.mock.callCount(), 1);
  assert.equal(submittedOrders.length, 0);
  assert.equal(cart.getItemsCount(), 1);

  customerForm.set('shippingCity', ' Providencia ');
  await cart.handleCheckoutSubmit(customerForm);
  assert.equal(submittedOrders.length, 1);
  const [submittedOrder] = submittedOrders;
  assert.equal(submittedOrder.url, '/api/v1/orders/');
  assert.equal(submittedOrder.payload.customer.delivery_method, 'shipping');
  assert.equal(submittedOrder.payload.customer.shipping_address, 'Calle de prueba 123');
  assert.equal(submittedOrder.payload.customer.shipping_city, 'Providencia');
  assert.equal(submittedOrder.payload.shipping_cost, 3990);
  assert.equal(submittedOrder.payload.total_amount, 15990);
});
