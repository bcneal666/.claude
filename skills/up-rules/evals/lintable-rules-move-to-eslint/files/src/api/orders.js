import { logger } from "../lib/logger.js";

export function createOrder(input, db) {
  if (!input || typeof input.sku !== "string") throw new TypeError("sku required");
  logger.info("create order", input.sku);
  return db.insert("orders", { sku: input.sku, qty: input.qty ?? 1 });
}
