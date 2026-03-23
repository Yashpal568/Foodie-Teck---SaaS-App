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
  'servora_plan'
];

export const saveAndClearWorkspace = () => {
  const user = JSON.parse(localStorage.getItem('servora_user'))
  if (!user) return

  const workspaces = JSON.parse(localStorage.getItem('servora_db_workspaces') || '{}')
  const userWorkspace = workspaces[user.email] || {}

  // Snapshot current state
  STANDARD_KEYS.forEach(key => {
    const val = localStorage.getItem(key)
    if (val) {
      userWorkspace[key] = val
    }
  })

  // Save to DB
  workspaces[user.email] = userWorkspace
  localStorage.setItem('servora_db_workspaces', JSON.stringify(workspaces))

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
