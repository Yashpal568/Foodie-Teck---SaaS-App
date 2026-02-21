
const storage = {
    'tableSessions': JSON.stringify([
        { tableNumber: 1, status: 'occupied', customers: 3 }
    ]),
};

const localStorage = {
    data: { ...storage },
    getItem: (key) => localStorage.data[key] || null,
    setItem: (key, value) => { localStorage.data[key] = value.toString(); }
};

const handleOrderUpdateLogic = (tableNumber, orderStatus, customers) => {
    const tables = JSON.parse(localStorage.getItem('tableSessions') || '[]');
    const updatedTables = tables.map(table => {
        if (table.tableNumber === tableNumber) {
            let newStatus = table.status;
            if (orderStatus === 'finished') newStatus = 'available';

            return {
                ...table,
                status: newStatus,
                // THE FIX: customers !== undefined ? customers : table.customers
                customers: customers !== undefined ? customers : table.customers
            };
        }
        return table;
    });
    localStorage.setItem('tableSessions', JSON.stringify(updatedTables));
};

const calculateActiveUsers = () => {
    const tables = JSON.parse(localStorage.getItem('tableSessions') || '[]');
    return tables.reduce((sum, t) => {
        if (t.status !== 'available') {
            return sum + (parseInt(t.customers) || 0);
        }
        return sum;
    }, 0);
};

console.log("--- Zero Reset Simulation ---");
console.log("Initial Active Users:", calculateActiveUsers()); // Should be 3

console.log("\n[ACTION] Finishing order for Table 1 (customers: 0)...");
handleOrderUpdateLogic(1, 'finished', 0);

const finalCount = calculateActiveUsers();
console.log("Final Active Users:", finalCount);

if (finalCount === 0) {
    console.log("\nVERIFICATION PASSED ✅ - Active Users reset correctly.");
} else {
    console.log("\nVERIFICATION FAILED ❌ - Active Users still at", finalCount);
}
