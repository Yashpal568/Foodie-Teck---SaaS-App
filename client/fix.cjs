const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

// Fix 1: Remove status from restaurants query
code = code.replace(/\.select\("id, status"\)/g, '.select("id")');
code = code.replace(/if \(rest\?\.status === "Suspended"\) \{[\s\S]*?return;\s*\}/, '');

// Fix 2: Fix the missing else block
const badBlock = /setIsExpired\(true\);\s*\/\/\s*No subscription or payment record found\.[\s\S]*?setIsExpired\(true\);\s*\}/;
const newBlock = `setIsExpired(true);
        } else {
          // No subscription or payment record found.
          // Check if the restaurant actually exists and is active in the DB.
          // Reuse the restaurant data already fetched above — no extra DB call needed
          const restaurantExists = rest && rest.id;

          if (restaurantExists) {
            // Restaurant exists — grant access with its actual plan name
            setSubDetails({ pendingApproval: false, utrNumber: "", status: "Active" });
            setPlan({ name: "Starter", purchaseDate: new Date().toISOString() });
            setIsExpired(false);
          } else {
            setSubDetails({ pendingApproval: false, utrNumber: "", status: "NO_SUBSCRIPTION" });
            setPlan({ name: "Starter", purchaseDate: new Date() });
            setIsExpired(true);
          }
        }`;
code = code.replace(badBlock, newBlock);

// Fix 3: Fix the early return case sensitivity
const badReturn = /setIsExpired\(sub\.status !== "ACTIVE" && sub\.status !== "PENDING_APPROVAL"\);/;
const newReturn = `const currentStatus = sub.status?.toUpperCase() || "";
              setIsExpired(currentStatus !== "ACTIVE" && currentStatus !== "APPROVED" && currentStatus !== "PENDING_APPROVAL");`;
code = code.replace(badReturn, newReturn);

fs.writeFileSync('src/pages/Dashboard.jsx', code);
console.log('Dashboard.jsx fixed via node script.');
