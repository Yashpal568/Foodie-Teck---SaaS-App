const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

code = code.replace(/\.select\("id, status"\)/g, '.select("id")');
code = code.replace(/if \(rest\?\.status === "Suspended"\) \{[\s\S]*?return;\s*\}/, '');
code = code.replace(/rest && rest\.status !== "Suspended"/g, 'rest && rest.id');

fs.writeFileSync('src/pages/Dashboard.jsx', code);
console.log('Fixed');
