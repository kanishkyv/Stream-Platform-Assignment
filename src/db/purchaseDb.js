const purchases = new Map(); // purchaseId -> record
const purchasesByIdempotency = new Map(); // idempotencyKey -> purchaseId

async function savePurchase(purchase) {
  await new Promise((r) => setTimeout(r, 15));
  purchases.set(purchase.purchaseId, { ...purchase, createdAt: Date.now() });
  if (purchase.idempotencyKey) purchasesByIdempotency.set(purchase.idempotencyKey, purchase.purchaseId);
  return purchases.get(purchase.purchaseId);
}

async function getPurchaseByIdempotencyKey(idempotencyKey) {
  await new Promise((r) => setTimeout(r, 5));
  const pid = purchasesByIdempotency.get(idempotencyKey);
  if (!pid) return null;
  return purchases.get(pid) || null;
}

module.exports = { savePurchase, getPurchaseByIdempotencyKey };

