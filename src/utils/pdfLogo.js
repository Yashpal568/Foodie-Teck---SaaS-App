// Utility to render the official Servora Logo & Icon to Base64 PNG for jsPDF exports

const SERVORA_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <rect width="96" height="96" rx="20" fill="#EDE9FE"/>
  <rect x="12" y="12" width="22" height="22" rx="4" fill="none" stroke="#6C5CE7" stroke-width="2.5"/>
  <rect x="16" y="16" width="14" height="14" rx="2.5" fill="#6C5CE7"/>
  <rect x="62" y="12" width="22" height="22" rx="4" fill="none" stroke="#6C5CE7" stroke-width="2.5"/>
  <rect x="66" y="16" width="14" height="14" rx="2.5" fill="#6C5CE7"/>
  <rect x="12" y="62" width="22" height="22" rx="4" fill="none" stroke="#6C5CE7" stroke-width="2.5"/>
  <rect x="16" y="66" width="14" height="14" rx="2.5" fill="#6C5CE7"/>
  <rect x="40" y="21" width="5" height="5" rx="1.2" fill="#6C5CE7" opacity="0.8"/>
  <rect x="13" y="48" width="5" height="5" rx="1.2" fill="#6C5CE7" opacity="0.9"/>
  <rect x="40" y="48" width="5" height="5" rx="1.2" fill="#6C5CE7" opacity="0.9"/>
  <rect x="78" y="48" width="5" height="5" rx="1.2" fill="#6C5CE7" opacity="0.9"/>
  <rect x="62" y="62" width="22" height="22" rx="4" fill="#6C5CE7"/>
  <line x1="70" y1="66" x2="70" y2="82" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="68" y1="66" x2="68" y2="69" stroke="white" stroke-width="1.3" stroke-linecap="round"/>
  <line x1="72" y1="66" x2="72" y2="69" stroke="white" stroke-width="1.3" stroke-linecap="round"/>
  <line x1="78" y1="66" x2="78" y2="82" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M78 66 Q82 69 78 73" stroke="white" stroke-width="1.3" stroke-linecap="round" fill="none"/>
</svg>`

let cachedLogoBase64 = null

export const getServoraLogoBase64 = () => {
  if (cachedLogoBase64) return Promise.resolve(cachedLogoBase64)
  
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined') return resolve(null)
      const blob = new Blob([SERVORA_ICON_SVG], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = 192 // 2x high resolution
          canvas.height = 192
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, 192, 192)
          URL.revokeObjectURL(url)
          const dataUrl = canvas.toDataURL('image/png')
          cachedLogoBase64 = dataUrl
          resolve(dataUrl)
        } catch {
          URL.revokeObjectURL(url)
          resolve(null)
        }
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }
      img.src = url
    } catch {
      resolve(null)
    }
  })
}
