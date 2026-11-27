import { supabase } from '@/lib/supabase'

/**
 * Image Storage Engine
 * Direct Supabase Bucket & DB Image Manager (Zero local cache dependency)
 */
export class ImageStorage {
  static BUCKET_NAME = 'menu-images'
  static inMemoryCache = new Map()

  // Save/Upload image for a specific menu item
  static async saveImage(itemId, imageDataUrl) {
    try {
      if (!imageDataUrl) return null
      this.inMemoryCache.set(itemId, imageDataUrl)
      
      // Update item image_url in menu_items table
      if (itemId && !itemId.toString().startsWith('temp-')) {
         await supabase.from('menu_items').update({ image_url: imageDataUrl }).eq('id', itemId)
      }
      return imageDataUrl
    } catch (error) {
      console.error('Error saving image to Supabase:', error)
      return imageDataUrl
    }
  }

  // Get image for a specific menu item
  static getImage(itemId) {
    return this.inMemoryCache.get(itemId) || null
  }

  // Remove image
  static removeImage(itemId) {
    this.inMemoryCache.delete(itemId)
    return true
  }

  // Clear cache
  static clearAllImages() {
    this.inMemoryCache.clear()
    return true
  }
}

export default ImageStorage
