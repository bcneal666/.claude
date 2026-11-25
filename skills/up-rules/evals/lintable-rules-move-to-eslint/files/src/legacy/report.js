import _ from "lodash";

export function totalsBySku(orders) {
  return _.mapValues(_.groupBy(orders, "sku"), (rows) => rows.length);
}
