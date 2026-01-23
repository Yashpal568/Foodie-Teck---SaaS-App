// Menu service for API calls
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class MenuService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // Fetch all menu items
  async getMenuItems(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.category && filters.category !== 'all') {
        queryParams.append('category', filters.category);
      }
      if (filters.type && filters.type !== 'all') {
        queryParams.append('type', filters.type);
      }
      if (filters.isInStock !== undefined) {
        queryParams.append('isInStock', filters.isInStock);
      }
      if (filters.search) {
        queryParams.append('search', filters.search);
      }
      
      const response = await fetch(`${this.baseUrl}/menu-items?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch menu items');
      return await response.json();
    } catch (error) {
      console.error('Error fetching menu items:', error);
      throw error;
    }
  }

  // Fetch single menu item
  async getMenuItem(id) {
    try {
      const response = await fetch(`${this.baseUrl}/menu-items/${id}`);
      if (!response.ok) throw new Error('Failed to fetch menu item');
      return await response.json();
    } catch (error) {
      console.error('Error fetching menu item:', error);
      throw error;
    }
  }

  // Create new menu item
  async createMenuItem(itemData) {
    try {
      const response = await fetch(`${this.baseUrl}/menu-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create menu item');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating menu item:', error);
      throw error;
    }
  }

  // Update menu item
  async updateMenuItem(id, itemData) {
    try {
      const response = await fetch(`${this.baseUrl}/menu-items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update menu item');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating menu item:', error);
      throw error;
    }
  }

  // Delete menu item
  async deleteMenuItem(id) {
    try {
      const response = await fetch(`${this.baseUrl}/menu-items/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete menu item');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      throw error;
    }
  }

  // Update stock status
  async updateStockStatus(id, isInStock) {
    try {
      const response = await fetch(`${this.baseUrl}/menu-items/${id}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isInStock }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update stock status');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating stock status:', error);
      throw error;
    }
  }

  // Get menu statistics
  async getMenuStats() {
    try {
      const response = await fetch(`${this.baseUrl}/menu-items/stats/summary`);
      if (!response.ok) throw new Error('Failed to fetch menu statistics');
      return await response.json();
    } catch (error) {
      console.error('Error fetching menu statistics:', error);
      throw error;
    }
  }
}

export default new MenuService();
