import { useState, useEffect, useCallback } from 'react'
import menuService from '../services/menuService'

export const useMenuManagement = () => {
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)

  const fetchMenuItems = useCallback(async (filters = {}) => {
    try {
      setLoading(true)
      setError(null)
      const response = await menuService.getMenuItems(filters)
      
      if (response.success) {
        setMenuItems(response.data.items)
        setCategories(response.data.categories)
      } else {
        setError(response.message)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const response = await menuService.getMenuStats()
      if (response.success) {
        setStats(response.data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }, [])

  const createMenuItem = useCallback(async (itemData) => {
    try {
      const response = await menuService.createMenuItem(itemData)
      if (response.success) {
        await fetchMenuItems()
        await fetchStats()
        return response.data
      } else {
        throw new Error(response.message)
      }
    } catch (err) {
      throw err
    }
  }, [fetchMenuItems, fetchStats])

  const updateMenuItem = useCallback(async (id, itemData) => {
    try {
      const response = await menuService.updateMenuItem(id, itemData)
      if (response.success) {
        await fetchMenuItems()
        await fetchStats()
        return response.data
      } else {
        throw new Error(response.message)
      }
    } catch (err) {
      throw err
    }
  }, [fetchMenuItems, fetchStats])

  const deleteMenuItem = useCallback(async (id) => {
    try {
      const response = await menuService.deleteMenuItem(id)
      if (response.success) {
        await fetchMenuItems()
        await fetchStats()
        return response.data
      } else {
        throw new Error(response.message)
      }
    } catch (err) {
      throw err
    }
  }, [fetchMenuItems, fetchStats])

  const updateStockStatus = useCallback(async (id, isInStock) => {
    try {
      const response = await menuService.updateStockStatus(id, isInStock)
      if (response.success) {
        await fetchMenuItems()
        await fetchStats()
        return response.data
      } else {
        throw new Error(response.message)
      }
    } catch (err) {
      throw err
    }
  }, [fetchMenuItems, fetchStats])

  useEffect(() => {
    fetchMenuItems()
    fetchStats()
  }, [fetchMenuItems, fetchStats])

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
