// Core Multi-Tenant Virtualization Engine
// This ensures that when the backend is substituted with localStorage, data is scoped per merchant.

const STANDARD_KEYS = [
  'orders', 
  'menuItems', 
  'tableSessions', 
  'categories', 
  'customers', 
  'salesData', 
  'userProfile', 
  'userNotifications', 
  'userSecurity', 
  'userBilling', 
  'servora_plan',
  'orderHistory',    // CRITICAL: Prevent cross-tenant database leakage
  'totalRevenue',    // CRITICAL: Prevent cross-tenant revenue leakage
  'menuAnalytics',   // CRITICAL: Prevent cross-tenant analytics leakage
  'lastAnalyticsReset'
];

export const saveAndClearWorkspace = () => {
  const user = JSON.parse(localStorage.getItem('servora_user'))
  if (!user) {
     // CRITICAL HOTFIX: Even if no user is previously authenticated, we MUST still completely wipe the ghost arrays. Otherwise new merchants inherit leftover orders!
     STANDARD_KEYS.forEach(key => localStorage.removeItem(key))
     return
  }

  const workspaces = JSON.parse(localStorage.getItem('servora_db_workspaces') || '{}')
  const userWorkspace = workspaces[user.email] || {}

  // Snapshot current state
  STANDARD_KEYS.forEach(key => {
    let val = localStorage.getItem(key)
    if (val) {
      // Massive Payload Interception: Strip base64 objects from menuItems to prevent QuotaExceededError
      if (key === 'menuItems') {
         try {
           let parsedItems = JSON.parse(val);
           parsedItems = parsedItems.map(item => {
             const trimmedItem = { ...item };
             if (trimmedItem.photo && trimmedItem.photo.length > 500) {
               delete trimmedItem.photo; // Nullify base64 payload footprint
             }
             return trimmedItem;
           });
           val = JSON.stringify(parsedItems);
         } catch(e) {}
      }
      userWorkspace[key] = val
    }
  })

  // Captured Dynamic Keys: Scan for QR clusters and move into workspace
  Object.keys(localStorage).forEach(k => {
     if (k.startsWith('qrCodes_')) {
        userWorkspace[k] = localStorage.getItem(k);
        localStorage.removeItem(k); // Move into tenant node
     }
  })


  // Save to DB
  try {
    workspaces[user.email] = userWorkspace
    localStorage.setItem('servora_db_workspaces', JSON.stringify(workspaces))
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      console.warn("System Storage Quota Hit: Executing aggressive garbage collection on dormant nodes...")
      // Keep only current user's workspace to salvage the session
      const salvagedWorks = { [user.email]: userWorkspace }
      
      // Attempt to clear massive local images caching memory leaks
      const keys = Object.keys(localStorage)
      for (const k of keys) {
         if (k.startsWith('image_') || k.startsWith('qrCodes_')) {
            localStorage.removeItem(k)
         }
      }
      
      try {
          localStorage.setItem('servora_db_workspaces', JSON.stringify(salvagedWorks))
      } catch (criticalErr) {
          console.error("Critical Storage Failure: The payload is structurally too large. Forcing bypass:", criticalErr)
          // Destroy the bloated key to free RAM instantly
          localStorage.removeItem('servora_db_workspaces')
          try {
             localStorage.setItem('servora_db_workspaces', '{}')
          } catch(e) {}
      }
    }
  }

  // Wipe global working directory so next user starts fresh
  STANDARD_KEYS.forEach(key => localStorage.removeItem(key))
}

export const loadWorkspace = (email) => {
  const workspaces = JSON.parse(localStorage.getItem('servora_db_workspaces') || '{}')
  const userWorkspace = workspaces[email] || {}

  // Ensure global scope is clean before loading
  STANDARD_KEYS.forEach(key => localStorage.removeItem(key))

  // Hydrate global scope with user's specific data
  Object.keys(userWorkspace).forEach(key => {
    localStorage.setItem(key, userWorkspace[key])
  })
}

export const initFreshWorkspace = () => {
  // Wipes standard keys to ensure a brand new workspace for a new registration
  STANDARD_KEYS.forEach(key => localStorage.removeItem(key))
}
