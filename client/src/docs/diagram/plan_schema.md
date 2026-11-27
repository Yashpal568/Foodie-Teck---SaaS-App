# Foodie-Tech – SaaS Plans (Phase-1)

- This document defines the monthly subscription plans for restaurants using the Foodie-Tech platform.

---

## 🟢 Basic Plan – Starter

**Best for:**  
- Small cafés, food stalls, single-floor restaurants.

### Features
- Restaurant dashboard  
- Manual menu management  
- QR code for each table  
- Customer menu & ordering  
- Add to cart & place order  
- Request bill  
- Table sessions  
- Order tracking (ORDERED / BILL_REQUESTED / FINISHED)

### Limits
- Up to **10 tables**  
- Up to **100 menu items**  
- **1 staff login** (manager/counter)

### Price (example)
₹999 / month

---

## 🔵 Pro Plan – Most Popular

**Best for:**  
Mid-size restaurants with multiple staff.

### Everything in Basic, plus:
- Unlimited menu items  
- Out-of-stock control  
- Multiple staff logins  
- Order history  
- Daily & monthly analytics  
- Restaurant branding (logo + colors)

### Limits
- Up to **40 tables**  
- Up to **5 staff logins**

### Price
₹2,499 / month

---

## 🟣 Premium Plan – Power Users

**Best for:**  
Large restaurants, chains, high-volume places.

### Everything in Pro, plus:
- Unlimited tables  
- Unlimited staff logins  
- Advanced analytics (top dishes, peak hours)  
- Multiple outlets under one owner  
- Priority support  
- Custom domain for menu (menu.myrestaurant.com)

### Limits
- No limits

### Price
₹4,999 / month

---

## Internal System Mapping

Each plan is stored in the system like this:

```js
Plan = {
  name: "PRO",
  maxTables: 40,
  maxStaff: 5,
  features: {
    analytics: true,
    branding: true,
    multiOutlet: false
  }
}
