-- up
CREATE TABLE orders (id serial PRIMARY KEY, sku text NOT NULL);
-- down
DROP TABLE orders;
