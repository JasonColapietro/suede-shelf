import assert from "node:assert/strict";
import { test } from "node:test";
import { CartError, orderBody, priceCart } from "../lib/cart";
import { store } from "./fixtures";

test("prices come from the catalog and duplicate lines merge", () => {
  const cart = priceCart(store, [
    { productId: "monstera", quantity: 1 },
    { productId: "pothos", quantity: 2 },
    { productId: "pothos", quantity: 1 },
  ]);
  assert.equal(cart.total, "75.50");
  assert.deepEqual(cart.lines.map((l) => [l.productId, l.quantity, l.unitPrice]), [
    ["monstera", 1, "39.50"],
    ["pothos", 3, "12.00"],
  ]);
});

test("cents arithmetic avoids float drift", () => {
  const s = { ...store, products: [{ id: "x", name: "X", price: "0.10", available: true }] };
  assert.equal(priceCart(s, [{ productId: "x", quantity: 3 }]).total, "0.30");
});

test("rejects unknown, out-of-stock, empty, fractional and oversized carts", () => {
  assert.throws(() => priceCart(store, []), CartError);
  assert.throws(() => priceCart(store, [{ productId: "nope", quantity: 1 }]), /No product with id nope/);
  assert.throws(() => priceCart(store, [{ productId: "snake", quantity: 1 }]), /out of stock/);
  assert.throws(() => priceCart(store, [{ productId: "pothos", quantity: 1.5 }]), /whole number/);
  assert.throws(() => priceCart(store, [{ productId: "pothos", quantity: 11 }]), /At most 10/);
});

test("order body routes payment to the merchant with a matching breakdown", () => {
  const body = orderBody(store, priceCart(store, [{ productId: "monstera", quantity: 2 }]), {
    returnUrl: "https://shelf.test/checkout/return",
    cancelUrl: "https://shelf.test/checkout/cancel",
  });
  const unit = body.purchase_units[0];
  assert.equal(body.intent, "CAPTURE");
  assert.deepEqual(unit.payee, { email_address: "merchant@business.example.com" });
  assert.deepEqual(unit.amount, { currency_code: "USD", value: "79.00", breakdown: { item_total: { currency_code: "USD", value: "79.00" } } });
  assert.deepEqual(unit.items, [{ name: "Monstera", quantity: "2", unit_amount: { currency_code: "USD", value: "39.50" }, sku: "M-1" }]);
  assert.equal(body.payment_source.paypal.experience_context.user_action, "PAY_NOW");
});

test("without a payee email the order pays the app's own merchant account", () => {
  const { payeeEmail: _omit, ...demo } = store;
  const body = orderBody(demo, priceCart(demo, [{ productId: "pothos", quantity: 1 }]), { returnUrl: "r", cancelUrl: "c" });
  assert.equal("payee" in body.purchase_units[0], false);
});
