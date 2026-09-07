/**
 * Cloudinary Upload Service
 * Offloads all media (dish photos, restaurant logos, cover banners) to Cloudinary CDN
 * to prevent database egress overload.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'vub5bfcq'
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'servora_menu'

/**
 * Checks if a string is already a remote URL (hosted on CDN/web)
 * @param {string} url 
 * @returns {boolean}
 */
export const isRemoteUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  return url.startsWith('http://') || url.startsWith('https://')
}

/**
 * Checks if a string is a base64 image data URI
 * @param {string} str 
 * @returns {boolean}
 */
export const isBase64Image = (str) => {
  if (!str || typeof str !== 'string') return false
  return str.startsWith('data:image/')
}

/**
 * Uploads a file, blob, or base64 string directly to Cloudinary.
 * If already a remote URL, returns it immediately without uploading.
 * 
 * @param {File|Blob|string} fileOrBase64 - Image to upload
 * @param {string} [folder='servora_uploads'] - Cloudinary folder/tag
 * @returns {Promise<string>} Secure HTTPS Cloudinary URL
 */
export const uploadToCloudinary = async (fileOrBase64, folder = 'servora_uploads') => {
  if (!fileOrBase64) return ''

  // 1. If it's already a hosted URL (Cloudinary, Unsplash, etc.), return as-is
  if (typeof fileOrBase64 === 'string' && isRemoteUrl(fileOrBase64)) {
    return fileOrBase64
  }

  // 2. Prepare FormData payload
  try {
    const formData = new FormData()

    if (fileOrBase64 instanceof File || fileOrBase64 instanceof Blob) {
      formData.append('file', fileOrBase64)
    } else if (typeof fileOrBase64 === 'string' && isBase64Image(fileOrBase64)) {
      // Convert base64 data URI to Blob for reliable fetch payload
      const res = await fetch(fileOrBase64)
      const blob = await res.blob()
      formData.append('file', blob)
    } else {
      // String but not base64 or remote URL
      return fileOrBase64
    }

    formData.append('upload_preset', UPLOAD_PRESET)
    if (folder) {
      formData.append('folder', folder)
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
    const uploadRes = await fetch(endpoint, {
      method: 'POST',
      body: formData
    })

    if (!uploadRes.ok) {
      const errJson = await uploadRes.json().catch(() => ({}))
      console.warn('Cloudinary upload returned non-200:', errJson)
      throw new Error(errJson?.error?.message || `Cloudinary upload failed (${uploadRes.status})`)
    }

    const data = await uploadRes.json()
    if (data && data.secure_url) {
      return data.secure_url
    }

    throw new Error('No secure_url returned by Cloudinary')
  } catch (err) {
    console.error('Error uploading image to Cloudinary CDN:', err)
    // If upload fails, avoid writing multi-MB base64 to DB.
    return typeof fileOrBase64 === 'string' && fileOrBase64.length < 500 ? fileOrBase64 : ''
  }
}
