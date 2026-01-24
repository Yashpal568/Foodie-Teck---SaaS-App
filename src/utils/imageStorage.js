// Image storage utility for menu items
export class ImageStorage {
  static STORAGE_KEY = 'foodie-tech-menu-images'

  // Save image for a specific menu item
  static saveImage(itemId, imageDataUrl) {
    try {
      const existingImages = this.getAllImages()
      existingImages[itemId] = imageDataUrl
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingImages))
      return true
    } catch (error) {
      console.error('Error saving image:', error)
      return false
    }
  }

  // Get image for a specific menu item
  static getImage(itemId) {
    try {
      const existingImages = this.getAllImages()
      return existingImages[itemId] || null
    } catch (error) {
      console.error('Error getting image:', error)
      return null
    }
  }

  // Get all stored images
  static getAllImages() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Error getting all images:', error)
      return {}
    }
  }

  // Remove image for a specific menu item
  static removeImage(itemId) {
    try {
      const existingImages = this.getAllImages()
      delete existingImages[itemId]
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingImages))
      return true
    } catch (error) {
      console.error('Error removing image:', error)
      return false
    }
  }

  // Clear all stored images
  static clearAllImages() {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
      return true
    } catch (error) {
      console.error('Error clearing images:', error)
      return false
    }
  }

  // Get storage size in bytes
  static getStorageSize() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? new Blob([stored]).size : 0
    } catch (error) {
      console.error('Error getting storage size:', error)
      return 0
    }
  }

  // Check if storage is getting full (warning at 4MB)
  static isStorageNearLimit() {
    const size = this.getStorageSize()
    return size > 4 * 1024 * 1024 // 4MB
  }
}

export default ImageStorage
