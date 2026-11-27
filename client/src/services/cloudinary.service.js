/**
 * Hardened Cloudinary Upload Service
 * Enforces MIME allowlist, file size limits, and sanitized tenant-scoped folders.
 */
import { supabase } from '@/lib/supabase'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'vub5bfcq'
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'servora_menu'

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
])
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB

export const isRemoteUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  return url.startsWith('https://') || url.startsWith('http://')
}

export const isBase64Image = (str) => {
  if (!str || typeof str !== 'string') return false
  return str.startsWith('data:image/')
}

export function sanitizeFolderPath(folder = 'servora_uploads', tenantId = null) {
  const cleaned = String(folder || 'servora_uploads')
    .replace(/\.\.+/g, '')
    .replace(/[^a-zA-Z0-9/_-]/g, '_')
    .replace(/^\/+|\/+$/g, '')
    .slice(0, 80)

  if (tenantId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(tenantId))) {
    return `servora/tenants/${tenantId}/${cleaned || 'assets'}`
  }
  return cleaned || 'servora_uploads'
}

export function validateImageAsset(fileOrBlob) {
  if (!fileOrBlob) throw new Error('No image asset provided.')
  const size = Number(fileOrBlob.size || 0)
  if (size <= 0) throw new Error('Uploaded image is empty.')
  if (size > MAX_UPLOAD_BYTES) {
    throw new Error(`Image exceeds maximum allowed size of ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`)
  }
  const mime = String(fileOrBlob.type || '').toLowerCase()
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
    throw new Error('Unsupported file type. Only JPEG, PNG, WEBP, and AVIF raster images are allowed.')
  }
}

export const uploadToCloudinary = async (fileOrBase64, folder = 'servora_uploads', tenantId = null) => {
  if (!fileOrBase64) return ''

  if (typeof fileOrBase64 === 'string' && isRemoteUrl(fileOrBase64)) {
    return fileOrBase64
  }

  let filePayload = null
  if (fileOrBase64 instanceof File || fileOrBase64 instanceof Blob) {
    validateImageAsset(fileOrBase64)
    filePayload = fileOrBase64
  } else if (typeof fileOrBase64 === 'string' && isBase64Image(fileOrBase64)) {
    const mimeMatch = fileOrBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/)
    const mime = mimeMatch ? mimeMatch[1].toLowerCase() : ''
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
      throw new Error('Unsupported base64 image type. Only JPEG, PNG, WEBP, and AVIF are permitted.')
    }
    const res = await fetch(fileOrBase64)
    const blob = await res.blob()
    validateImageAsset(blob)
    filePayload = blob
  } else {
    throw new Error('Invalid asset format provided for upload.')
  }

  // Enforce authenticated upload when outside isolated demo mode
  const isDemoTenant = tenantId === 'demo-merchant' || tenantId === 'demo'
  if (!isDemoTenant) {
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      throw new Error('Authentication required before uploading restaurant media assets.')
    }
  }

  const formData = new FormData()
  formData.append('file', filePayload)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', sanitizeFolderPath(folder, tenantId))

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
  const uploadRes = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  })

  if (!uploadRes.ok) {
    const errJson = await uploadRes.json().catch(() => ({}))
    throw new Error(errJson?.error?.message || `Cloudinary upload failed (${uploadRes.status})`)
  }

  const data = await uploadRes.json()
  if (data && data.secure_url) {
    return data.secure_url
  }

  throw new Error('No secure_url returned by Cloudinary')
}
