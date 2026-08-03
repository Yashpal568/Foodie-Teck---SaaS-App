import { 
  fetchMenuItems, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem, 
  toggleMenuItemStock,
  getMyRestaurant,
  supabase
} from '@/lib/api'

class MenuService {
  async getMenuItems(restaurantId) {
    try {
      let idToUse = restaurantId
      if (!idToUse) {
        const res = await getMyRestaurant()
        idToUse = res?.id
      }
      if (!idToUse) return { success: true, data: { items: [], categories: [] } }
      const items = await fetchMenuItems(idToUse)
      const categories = [...new Set((items || []).map(i => i.category).filter(Boolean))]
      return { success: true, data: { items: items || [], categories } }
    } catch (error) {
      console.error('Error fetching menu items:', error)
      return { success: false, message: error.message }
    }
  }

  async getMenuItem(id) {
    try {
      const { data, error } = await supabase.from('menu_items').select('*').eq('id', id).single()
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching menu item:', error)
      return { success: false, message: error.message }
    }
  }

  async createMenuItem(restaurantId, itemData) {
    try {
      const data = await createMenuItem(restaurantId, itemData)
      return { success: true, data }
    } catch (error) {
      console.error('Error creating menu item:', error)
      return { success: false, message: error.message }
    }
  }

  async updateMenuItem(id, itemData) {
    try {
      const data = await updateMenuItem(id, itemData)
      return { success: true, data }
    } catch (error) {
      console.error('Error updating menu item:', error)
      return { success: false, message: error.message }
    }
  }

  async deleteMenuItem(id) {
    try {
      await deleteMenuItem(id)
      return { success: true }
    } catch (error) {
      console.error('Error deleting menu item:', error)
      return { success: false, message: error.message }
    }
  }

  async updateStockStatus(id, isInStock) {
    try {
      const data = await toggleMenuItemStock(id, isInStock)
      return { success: true, data }
    } catch (error) {
      console.error('Error updating stock status:', error)
      return { success: false, message: error.message }
    }
  }

  async getMenuStats(restaurantId) {
    try {
      let idToUse = restaurantId
      if (!idToUse) {
        const res = await getMyRestaurant()
        idToUse = res?.id
      }
      if (!idToUse) return { success: true, data: { totalItems: 0, inStockCount: 0, outOfStockCount: 0 } }
      const items = await fetchMenuItems(idToUse)
      return {
        success: true,
        data: {
          totalItems: items.length,
          inStockCount: items.filter(i => i.isInStock).length,
          outOfStockCount: items.filter(i => !i.isInStock).length
        }
      }
    } catch (error) {
      console.error('Error fetching menu statistics:', error)
      return { success: false, message: error.message }
    }
  }
}

export default new MenuService()

