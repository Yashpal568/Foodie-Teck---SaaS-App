import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  fetchMenuItems as apiFetchMenuItems, 
  createMenuItem as apiCreateMenuItem, 
  updateMenuItem as apiUpdateMenuItem, 
  deleteMenuItem as apiDeleteMenuItem, 
  toggleMenuItemStock as apiToggleStock,
  getMyRestaurant 
} from '@/lib/api'

export const useMenuManagement = (restaurantId) => {
  const [resolvedId, setResolvedId] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 1. Identity Resolution
  useEffect(() => {
    let isMounted = true
    async function resolve() {
      if (restaurantId) {
        if (restaurantId.includes('@')) {
          const { data } = await supabase
            .from('restaurants')
            .select('id')
            .eq('email', restaurantId.toLowerCase())
            .single()
          if (isMounted && data?.id) setResolvedId(data.id)
        } else {
          if (isMounted) setResolvedId(restaurantId)
        }
      } else {
        const profile = await getMyRestaurant()
        if (isMounted && profile?.id) setResolvedId(profile.id)
      }
    }
    resolve()
    return () => { isMounted = false }
  }, [restaurantId])

  // 2. Fetch Menu Items from Supabase
  const fetchMenuItems = useCallback(async (showLoading = true) => {
    if (!resolvedId) return
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const items = await apiFetchMenuItems(resolvedId)
      setMenuItems(items)
      const uniqueCategories = [...new Set(items.map(i => i.category).filter(Boolean))]
      setCategories(uniqueCategories)
    } catch (err) {
      console.error('Error fetching menu items from Supabase:', err)
      setError(err.message)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [resolvedId])

  // 3. Realtime WebSockets for Live Menu Sync across devices
  useEffect(() => {
    if (!resolvedId) return

    fetchMenuItems(true)

    const channel = supabase
      .channel(`public:menu_items:rid=${resolvedId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items',
          filter: `restaurant_id=eq.${resolvedId}`
        },
        () => {
          fetchMenuItems(false) // Background live update
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [resolvedId, fetchMenuItems])

  // 4. Create Menu Item via Supabase
  const createMenuItem = useCallback(async (itemData) => {
    if (!resolvedId) throw new Error('Restaurant ID not resolved')
    try {
      const newItem = await apiCreateMenuItem(resolvedId, itemData)
      await fetchMenuItems(false)
      return newItem
    } catch (err) {
      console.error('Error creating menu item:', err)
      throw err
    }
  }, [resolvedId, fetchMenuItems])

  // 5. Update Menu Item via Supabase
  const updateMenuItem = useCallback(async (id, itemData) => {
    try {
      const updated = await apiUpdateMenuItem(id, itemData)
      await fetchMenuItems(false)
      return updated
    } catch (err) {
      console.error('Error updating menu item:', err)
      throw err
    }
  }, [fetchMenuItems])

  // 6. Delete Menu Item via Supabase
  const deleteMenuItem = useCallback(async (id) => {
    try {
      const res = await apiDeleteMenuItem(id)
      await fetchMenuItems(false)
      return res
    } catch (err) {
      console.error('Error deleting menu item:', err)
      throw err
    }
  }, [fetchMenuItems])

  // 7. Toggle Stock Status via Supabase
  const updateStockStatus = useCallback(async (id, isInStock) => {
    try {
      const updated = await apiToggleStock(id, isInStock)
      await fetchMenuItems(false)
      return updated
    } catch (err) {
      console.error('Error toggling stock status:', err)
      throw err
    }
  }, [fetchMenuItems])

  const stats = {
    totalItems: menuItems.length,
    inStockCount: menuItems.filter(i => i.isInStock).length,
    outOfStockCount: menuItems.filter(i => !i.isInStock).length,
    categoriesCount: categories.length
  }

  return {
    menuItems,
    categories,
    loading,
    error,
    stats,
    refetch: fetchMenuItems,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    updateStockStatus
  }
}

export default useMenuManagement

