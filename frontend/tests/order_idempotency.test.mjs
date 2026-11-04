import test from "node:test";
import assert from "node:assert/strict";

// La versión base del cliente usa Storage para el token del taller. Lo aislamos
// para comprobar exclusivamente el contrato HTTP de creación de pedidos.
const storageStub = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
globalThis.sessionStorage = storageStub;
globalThis.localStorage = storageStub;

const { apiService } = await import("../js/services/api.js");

test("checkout uses Idempotency-Key and preserves request body", async () => {
  const originalFetch = globalThis.fetch;
  let capturedRequest;

  globalThis.fetch = async (url, options) => {
    capturedRequest = { url, options };
    return { ok: true, json: async () => ({ id: "order-01" }) };
  };

  const payload = { customer: { full_name: "QA" }, items: [{ quantity: 1 }] };
  try {
    const response = await apiService.createOrder(payload, "stable-uuid-for-retry");
    assert.equal(response.id, "order-01");
    assert.equal(capturedRequest.url, "/api/v1/orders/");
    assert.equal(capturedRequest.options.headers["Idempotency-Key"], "stable-uuid-for-retry");
    assert.deepEqual(JSON.parse(capturedRequest.options.body), payload);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
