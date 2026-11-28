import { toast } from 'sonner'

/**
 * Web & Desktop Push Notification Engine
 * Manages browser push notification permissions, native system toasts, and silent Sonner UI alerts.
 */

/**
 * Request Browser Desktop Notification Permission
 */
export const requestPushPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Web Push Notifications are not supported in this browser.')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      toast.success('Push Notifications Enabled', {
        description: 'You will receive real-time desktop alerts for payments, orders, and security events.'
      })
      return true
    }
  }

  return false
}

/**
 * Trigger Web & Desktop Push Notification
 * @param {Object} options 
 * @param {string} options.title - Notification Title
 * @param {string} options.body - Notification Body Message
 * @param {string} [options.icon] - Icon URL
 * @param {string} [options.tag] - Unique tag ID
 * @param {Function} [options.onClick] - Click callback handler
 * @param {boolean} [options.sound=false] - Play audio chime (disabled across dashboard)
 */
export const triggerPushNotification = ({ title, body, icon = '/logo.png', tag, onClick, sound = false }) => {
  try {
    void sound

    // 1. Trigger In-App Sonner Toast
    toast(title, {
      description: body,
      duration: 5000,
      action: onClick ? {
        label: 'View',
        onClick: () => { onClick() }
      } : undefined
    })

    // 2. Trigger Browser Native System Push Notification silently (if permission granted)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const pushNotif = new Notification(title, {
        body: body,
        icon: icon,
        badge: icon,
        tag: tag || `notif-${Date.now()}`,
        requireInteraction: false,
        silent: true
      })

      if (onClick) {
        pushNotif.onclick = (e) => {
          e.preventDefault()
          window.focus()
          onClick()
          pushNotif.close()
        }
      }
    }
  } catch (err) {
    console.error('Push Notification trigger failed:', err)
  }
}
