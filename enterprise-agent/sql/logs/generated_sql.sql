
================================================================================
Timestamp : 2026-07-08 10:17:17.709506
Question  : 

Generated SQL:

SELECT
  c.company_name,
  COUNT(o.order_id) AS total_orders
FROM customers AS c
JOIN orders AS o
  ON c.customer_id = o.customer_id
GROUP BY
  c.customer_id,
  c.company_name
ORDER BY
  c.company_name;
================================================================================

