/**
 * SERVORA — Supabase API Service Layer
 * Centralizes all DB interactions.
 * Note: This file has been refactored into modular services.
 * It now acts as a barrel file to ensure zero breaking changes.
 */

import { supabase } from './supabase'
export { supabase }

// Re-export Modular Services
export * from '../services/restaurant.service'
export * from '../services/menu.service'
export * from '../services/admin.service'
export * from '../services/order.service'
export * from '../services/table.service'
export * from '../services/customer.service'
export * from '../services/notification.service'

// Alias for backward compatibility
import { recordPriceChange } from '../services/admin.service'
export const logPriceChange = recordPriceChange
