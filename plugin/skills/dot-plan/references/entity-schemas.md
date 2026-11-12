# Entity schemas

Schema details for the [`dot-plan`](../SKILL.md) skill. A domain entity is a thing that the domain names and that the code stores or sends, such as an order, a user, or an invoice.

## Format

Write each schema in JSON Schema draft 2020-12, in a `json` block. Give it `$schema`, `$id`, `title`, `type`, `required`, and `properties`.

- For a new entity, show the full schema.
- For a changed entity, show a `diff` block of the schema before and after the change.

Put the schemas in the plan. Do not commit schema files to the target repository.

## Model the domain

Make the illegal states impossible to write in the schema:

- Model a lifecycle as one `status` field with an `enum`, not as booleans that must agree, such as `isPaid` and `isShipped`.
- Model variants with a `kind` field and `oneOf`, not as one object with optional fields for each variant.
- Use `minItems: 1` for a list that must have an item.

## Example: a new entity

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:example:order",
  "title": "Order",
  "type": "object",
  "required": ["id", "customerId", "status", "items"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "customerId": { "type": "string", "format": "uuid" },
    "status": { "enum": ["pending", "paid", "shipped"] },
    "items": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["sku", "quantity"],
        "properties": {
          "sku": { "type": "string" },
          "quantity": { "type": "integer", "minimum": 1 }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

## Example: a changed entity

The change replaces two booleans with a `status` field:

```diff
-  "required": ["id", "customerId", "paid", "shipped"],
+  "required": ["id", "customerId", "status"],
   "properties": {
     "id": { "type": "string", "format": "uuid" },
     "customerId": { "type": "string", "format": "uuid" },
-    "paid": { "type": "boolean" },
-    "shipped": { "type": "boolean" }
+    "status": { "enum": ["pending", "paid", "shipped"] }
   },
