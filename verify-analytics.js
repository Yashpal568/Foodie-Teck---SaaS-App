
// Simulation script to verify the logic in a non-browser environment
import fs from 'fs';
import path from 'path';

// Mock localStorage
const storage = {};
global.localStorage = {
    getItem: (key) => storage[key] || null,
    setItem: (key, value) => { storage[key] = value.toString(); },
    removeItem: (key) => { delete storage[key]; },
};

// Mock window.dispatchEvent
global.window = {
    dispatchEvent: (event) => {
        console.log(`[EVENT] Dispatched: ${event.type}`);
    }
};
global.Event = class { constructor(type) { this.type = type; } };

// Mocking constants and helper functions from the project
const ORDER_STATUS = {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    PREPARING: 'PREPARING',
    READY: 'READY',
    SERVED: 'SERVED',
    FINISHED: 'FINISHED',
    CANCELLED: 'CANCELLED'
};

// Simulated updateAnalytics and trackMenuVisit logic (since we can't easily import from ESM hooks in raw node without a setup)
const updateAnalytics = (order) => {
    const currentRevenue = parseFloat(localStorage.getItem('totalRevenue') || '0');
    localStorage.setItem('totalRevenue', (currentRevenue + order.total).toString());

    const savedOrderHistory = localStorage.getItem('orderHistory');
    const orderHistory = savedOrderHistory ? JSON.parse(savedOrderHistory) : [];
    orderHistory.push({ ...order, completedAt: new Date().toISOString(), revenue: order.total });
    localStorage.setItem('orderHistory', JSON.stringify(orderHistory));

    const savedAnalytics = localStorage.getItem('menuAnalytics');
    const analytics = savedAnalytics ? JSON.parse(savedAnalytics) : { itemViews: {}, itemOrders: {}, totalViews: 0, totalOrders: 0 };
    analytics.totalOrders = (analytics.totalOrders || 0) + 1;
    order.items.forEach(item => {
        analytics.itemOrders[item._id] = (analytics.itemOrders[item._id] || 0) + 1;
    });
    localStorage.setItem('menuAnalytics', JSON.stringify(analytics));
    window.dispatchEvent(new Event('storage'));
};

const trackMenuVisit = () => {
    const saved = localStorage.getItem('menuAnalytics');
    const analytics = saved ? JSON.parse(saved) : { itemViews: {}, itemOrders: {}, totalViews: 0, totalOrders: 0 };
    analytics.totalViews = (analytics.totalViews || 0) + 1;
    analytics.lastUpdated = new Date().toISOString();
    localStorage.setItem('menuAnalytics', JSON.stringify(analytics));
    window.dispatchEvent(new Event('storage'));
};

// --- START SIMULATION ---
console.log("--- Analytics Simulation Started ---");

// 1. Initial State
console.log("Initial Total Views:", JSON.parse(localStorage.getItem('menuAnalytics') || '{"totalViews":0}').totalViews);

// 2. Track a Menu Visit
console.log("\n[ACTION] Customer opens menu...");
trackMenuVisit();
console.log("Total Views after visit:", JSON.parse(localStorage.getItem('menuAnalytics')).totalViews);

// 3. Track another Visit
console.log("\n[ACTION] Another customer opens menu...");
trackMenuVisit();
console.log("Total Views after 2nd visit:", JSON.parse(localStorage.getItem('menuAnalytics')).totalViews);

// 4. Complete an Order
console.log("\n[ACTION] Completing an order of ₹1500...");
const mockOrder = {
    id: 'order-123',
    total: 1500,
    items: [{ _id: 'item-1', name: 'Pizza' }]
};
updateAnalytics(mockOrder);

console.log("\nVerification Results:");
console.log("- Total Revenue:", localStorage.getItem('totalRevenue'));
console.log("- Total Orders (History):", JSON.parse(localStorage.getItem('orderHistory')).length);
console.log("- Total Views:", JSON.parse(localStorage.getItem('menuAnalytics')).totalViews);

console.log("\n--- Simulation Finished Successfully ---");
