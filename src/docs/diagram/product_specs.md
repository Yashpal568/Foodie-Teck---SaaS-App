- Restaurants manually add their menu in their dashboard  
  - Dish name  
  - Price  
  - Description  
  - Photo  
  - Veg / non-veg  
  - Stock (in stock / out of stock)  

- Restaurants generate QR codes  
  - Each QR opens a Foodie-Tech URL that shows that restaurant’s menu  
  - The QR contains the restaurant ID and table number  

- Restaurants generate one QR for each table  
  - Table 1 → QR  
  - Table 2 → QR  
  - Table 3 → QR  
  - All QRs open the same menu but with the correct table number attached  

- Customers scan the QR  
  - The menu opens  
  - Restaurant name, logo, and table number are shown  
  - A table session is created if one is not already open  

- A table session represents one group of customers at a table  
  - All orders and the bill are attached to this session  
  - When the session is closed, the table becomes free  

- Customers browse the menu  
  - They see dish photos, names, prices, and descriptions  
  - Out-of-stock items are hidden  

- Customers add items to cart  
  - They can change quantity  
  - They can add special instructions (less spicy, no onion, etc.)  

- Customers place the order  
  - The order is created in the system  
  - It is linked to the restaurant, table number, and table session  
  - Order status becomes **ORDERED**  

- The restaurant dashboard shows all orders  
  - With table number  
  - Items  
  - Special notes  
  - Status  

- Order status flow  
  - **ORDERED** – customer placed the order  
  - **BILL_REQUESTED** – customer asked for the bill  
  - **FINISHED** – payment done and table closed  

- The restaurant prepares and serves food in the real world  
  - The app is only for tracking, not cooking  

- Customers click **Request Bill**  
  - Order status changes to **BILL_REQUESTED**  
  - Counter sees the request  

- The counter gives the bill and collects payment (outside the app)  

- After payment, the counter clicks **Finish Table**  
  - The table session is closed  
  - All related orders become **FINISHED**  
  - The table is now ready for new customers  

- The customer journey ends  
  - New customers scanning the same QR will start a new table session  
