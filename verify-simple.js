
const storage = {};
const localStorage = {
    getItem: (key) => storage[key] || null,
    setItem: (key, value) => { storage[key] = value.toString(); }
};

const trackMenuVisit = () => {
    const saved = localStorage.getItem('menuAnalytics');
    const analytics = saved ? JSON.parse(saved) : { totalViews: 0 };
    analytics.totalViews = (analytics.totalViews || 0) + 1;
    localStorage.setItem('menuAnalytics', JSON.stringify(analytics));
    console.log("INCREMENTED: Total Views is now", analytics.totalViews);
};

const updateAnalytics = (total) => {
    const current = parseFloat(localStorage.getItem('totalRevenue') || '0');
    localStorage.setItem('totalRevenue', (current + total).toString());
    console.log("UPDATED: Total Revenue is now", localStorage.getItem('totalRevenue'));
};

console.log("START TEST");
console.log("Initial views:", localStorage.getItem('menuAnalytics'));
trackMenuVisit();
trackMenuVisit();
console.log("Final views check:", localStorage.getItem('menuAnalytics'));
updateAnalytics(500);
updateAnalytics(1000);
console.log("Final revenue check:", localStorage.getItem('totalRevenue'));
console.log("END TEST");
