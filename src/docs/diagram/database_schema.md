# Foodie-Tech MongoDB Database Schema

## Overview
This document contains the complete database schema for the Foodie-Tech restaurant ordering system using MongoDB Atlas.

---

## Collections

### 1. **restaurants**

Stores restaurant information including name, logo, and contact details.

**Schema:**
```javascript
{
  _id: ObjectId,
  name: String,              // Restaurant name
  logo: String,              // URL to logo image
  email: String,             // Contact email (unique)
  phone: String,             // Contact phone
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Example Document:**
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  name: "Spice Garden Restaurant",
  logo: "https://storage.example.com/logos/spice-garden.jpg",
  email: "contact@spicegarden.com",
  phone: "+91-9876543210",
  address: {
    street: "123 MG Road",
    city: "Agra",
    state: "Uttar Pradesh",
    pincode: "282001"
  },
  createdAt: ISODate("2025-01-15T10:00:00Z"),
  updatedAt: ISODate("2025-01-20T14:30:00Z")
}
```

---

### 2. **menu_items**

Stores all dishes with their details, pricing, and availability.

**Schema:**
```javascript
{
  _id: ObjectId,
  restaurantId: ObjectId,    // Reference to restaurants collection
  name: String,              // Dish name
  description: String,       // Dish description
  price: Number,             // Price in currency units
  photo: String,             // URL to dish photo
  category: String,          // e.g., "Starters", "Main Course", "Desserts"
  type: String,              // "VEG" or "NON_VEG"
  isInStock: Boolean,        // true = available, false = out of stock
  createdAt: Date,
  updatedAt: Date
}
```

**Example Document:**
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439012"),
  restaurantId: ObjectId("507f1f77bcf86cd799439011"),
  name: "Paneer Tikka Masala",
  description: "Cottage cheese cubes in rich creamy tomato gravy",
  price: 280,
  photo: "https://storage.example.com/dishes/paneer-tikka.jpg",
  category: "Main Course",
  type: "VEG",
  isInStock: true,
  createdAt: ISODate("2025-01-15T10:30:00Z"),
  updatedAt: ISODate("2025-01-22T09:00:00Z")
}
```

---

### 3. **tables**

Stores table information and QR codes for each restaurant.

**Schema:**
```javascript
{
  _id: ObjectId,
  restaurantId: ObjectId,    // Reference to restaurants collection
  tableNumber: String,       // e.g., "1", "2", "A1", "B2"
  qrCode: String,            // URL or base64 encoded QR code image
  qrUrl: String,             // The URL that QR points to
  capacity: Number,          // Optional: number of seats
  createdAt: Date,
  updatedAt: Date
}
```

**Example Document:**
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439013"),
  restaurantId: ObjectId("507f1f77bcf86cd799439011"),
  tableNumber: "5",
  qrCode: "https://storage.example.com/qr/table-5-qr.png",
  qrUrl: "https://foodie-tech.com/menu/507f1f77bcf86cd799439011/table/5",
  capacity: 4,
  createdAt: ISODate("2025-01-15T11:00:00Z"),
  updatedAt: ISODate("2025-01-15T11:00:00Z")
}
```

---

### 4. **table_sessions**

Tracks active customer sessions at tables. One session represents one group of customers.

**Schema:**
```javascript
{
  _id: ObjectId,
  restaurantId: ObjectId,    // Reference to restaurants collection
  tableId: ObjectId,         // Reference to tables collection
  tableNumber: String,       // Denormalized for quick access
  status: String,            // "ACTIVE" or "CLOSED"
  startedAt: Date,           // When session started
  closedAt: Date,            // When session ended (null if active)
  createdAt: Date,
  updatedAt: Date
}
```

**Example Document:**
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439014"),
  restaurantId: ObjectId("507f1f77bcf86cd799439011"),
  tableId: ObjectId("507f1f77bcf86cd799439013"),
  tableNumber: "5",
  status: "ACTIVE",
  startedAt: ISODate("2025-01-22T12:30:00Z"),
  closedAt: null,
  createdAt: ISODate("2025-01-22T12:30:00Z"),
  updatedAt: ISODate("2025-01-22T12:30:00Z")
}
```

---

### 5. **orders**

Stores all customer orders with items, special instructions, and status tracking.

**Schema:**
```javascript
{
  _id: ObjectId,
  restaurantId: ObjectId,    // Reference to restaurants collection
  tableSessionId: ObjectId,  // Reference to table_sessions collection
  tableNumber: String,       // Denormalized for quick access
  items: [                   // Array of ordered items
    {
      menuItemId: ObjectId,  // Reference to menu_items collection
      name: String,          // Denormalized dish name
      price: Number,         // Denormalized price at time of order
      quantity: Number,      // Number of items
      specialInstructions: String, // e.g., "less spicy", "no onion"
      subtotal: Number       // price * quantity
    }
  ],
  totalAmount: Number,       // Sum of all item subtotals
  status: String,            // "ORDERED", "BILL_REQUESTED", "FINISHED"
  orderedAt: Date,           // When order was placed
  billRequestedAt: Date,     // When bill was requested (null if not yet)
  finishedAt: Date,          // When payment completed (null if not yet)
  createdAt: Date,
  updatedAt: Date
}
```

**Example Document:**
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439015"),
  restaurantId: ObjectId("507f1f77bcf86cd799439011"),
  tableSessionId: ObjectId("507f1f77bcf86cd799439014"),
  tableNumber: "5",
  items: [
    {
      menuItemId: ObjectId("507f1f77bcf86cd799439012"),
      name: "Paneer Tikka Masala",
      price: 280,
      quantity: 2,
      specialInstructions: "less spicy",
      subtotal: 560
    },
    {
      menuItemId: ObjectId("507f1f77bcf86cd799439016"),
      name: "Garlic Naan",
      price: 50,
      quantity: 4,
      specialInstructions: "",
      subtotal: 200
    }
  ],
  totalAmount: 760,
  status: "ORDERED",
  orderedAt: ISODate("2025-01-22T12:45:00Z"),
  billRequestedAt: null,
  finishedAt: null,
  createdAt: ISODate("2025-01-22T12:45:00Z"),
  updatedAt: ISODate("2025-01-22T12:45:00Z")
}
```

---

## Indexes

### restaurants
```javascript
db.restaurants.createIndex({ email: 1 }, { unique: true });
```

### menu_items
```javascript
db.menu_items.createIndex({ restaurantId: 1 });
db.menu_items.createIndex({ restaurantId: 1, isInStock: 1 });
```

### tables
```javascript
db.tables.createIndex({ restaurantId: 1, tableNumber: 1 }, { unique: true });
```

### table_sessions
```javascript
db.table_sessions.createIndex({ restaurantId: 1, status: 1 });
db.table_sessions.createIndex({ tableId: 1, status: 1 });
db.table_sessions.createIndex({ tableNumber: 1, status: 1 });
```

### orders
```javascript
db.orders.createIndex({ restaurantId: 1, status: 1 });
db.orders.createIndex({ tableSessionId: 1 });
db.orders.createIndex({ restaurantId: 1, tableNumber: 1, status: 1 });
db.orders.createIndex({ orderedAt: -1 });
```

---

## Common Queries

### Get active table session for a table
```javascript
db.table_sessions.findOne({
  restaurantId: ObjectId("507f1f77bcf86cd799439011"),
  tableNumber: "5",
  status: "ACTIVE"
});
```

### Get all in-stock menu items for a restaurant
```javascript
db.menu_items.find({
  restaurantId: ObjectId("507f1f77bcf86cd799439011"),
  isInStock: true
}).sort({ category: 1, name: 1 });
```

### Get all orders for a restaurant with specific status
```javascript
db.orders.find({
  restaurantId: ObjectId("507f1f77bcf86cd799439011"),
  status: "ORDERED"
}).sort({ orderedAt: -1 });
```

### Get all orders for a table session
```javascript
db.orders.find({
  tableSessionId: ObjectId("507f1f77bcf86cd799439014")
}).sort({ orderedAt: 1 });
```

### Update order status to BILL_REQUESTED
```javascript
db.orders.updateMany(
  {
    tableSessionId: ObjectId("507f1f77bcf86cd799439014"),
    status: "ORDERED"
  },
  {
    $set: {
      status: "BILL_REQUESTED",
      billRequestedAt: new Date(),
      updatedAt: new Date()
    }
  }
);
```

### Finish table session and all orders
```javascript
// Step 1: Update all orders to FINISHED
db.orders.updateMany(
  {
    tableSessionId: ObjectId("507f1f77bcf86cd799439014"),
    status: { $ne: "FINISHED" }
  },
  {
    $set: {
      status: "FINISHED",
      finishedAt: new Date(),
      updatedAt: new Date()
    }
  }
);

// Step 2: Close the table session
db.table_sessions.updateOne(
  { _id: ObjectId("507f1f77bcf86cd799439014") },
  {
    $set: {
      status: "CLOSED",
      closedAt: new Date(),
      updatedAt: new Date()
    }
  }
);
```

---

## Schema Validation

### orders collection validation
```javascript
db.createCollection("orders", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["restaurantId", "tableSessionId", "tableNumber", "items", "totalAmount", "status", "orderedAt"],
      properties: {
        restaurantId: { bsonType: "objectId" },
        tableSessionId: { bsonType: "objectId" },
        tableNumber: { bsonType: "string" },
        items: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["menuItemId", "name", "price", "quantity", "subtotal"],
            properties: {
              menuItemId: { bsonType: "objectId" },
              name: { bsonType: "string" },
              price: { bsonType: "number", minimum: 0 },
              quantity: { bsonType: "int", minimum: 1 },
              specialInstructions: { bsonType: "string" },
              subtotal: { bsonType: "number", minimum: 0 }
            }
          }
        },
        totalAmount: { bsonType: "number", minimum: 0 },
        status: {
          enum: ["ORDERED", "BILL_REQUESTED", "FINISHED"]
        },
        orderedAt: { bsonType: "date" },
        billRequestedAt: { bsonType: ["date", "null"] },
        finishedAt: { bsonType: ["date", "null"] }
      }
    }
  }
});
```

---

## Order Status Flow

1. **ORDERED** - Customer placed the order
2. **BILL_REQUESTED** - Customer requested the bill
3. **FINISHED** - Payment completed and table closed

---

## Design Notes

- **Denormalization**: `tableNumber` is duplicated in sessions and orders for faster queries
- **Embedded Documents**: Order items are embedded within orders since they're always accessed together
- **Referential Integrity**: Use application-level logic to maintain relationships between collections
- **Indexing Strategy**: Optimized for common query patterns (by restaurant, status, and table)