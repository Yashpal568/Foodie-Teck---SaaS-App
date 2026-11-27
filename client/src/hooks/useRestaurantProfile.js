import { useState, useEffect, useCallback } from 'react'
import { getMyRestaurant, updateRestaurantProfile, fetchGstSettings, supabase } from '@/lib/api'

const readLocalGstin = (restaurantId) => {
    try {
        if (typeof window === 'undefined' || !restaurantId) return ''
        return (
            window.localStorage.getItem(`servora_restaurant_gstin_${restaurantId}`) ||
            window.localStorage.getItem(`servora_gstin_${restaurantId}`) ||
            ''
        ).trim().toUpperCase()
    } catch {
        return ''
    }
}

/**
 * Hook to manage restaurant profile + GST configuration via Supabase
 */
export const useRestaurantProfile = (restaurantId) => {
    const isDemo = restaurantId === 'demo-merchant' || restaurantId === 'demo' || restaurantId === 'guest'
    const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

    const [profile, setProfile] = useState(() => ({
        id: restaurantId || null,
        name: isDemo ? 'Servora Demo Kitchen' : '',
        business_name: isDemo ? 'Servora Demo Kitchen' : '',
        email: '',
        address: '',
        phone: '',
        gstin: '',
        gstEnabled: false,
        gstRate: 0,
        gstLabel: 'GST',
        description: 'Premium Dining Experience',
        plan: 'Professional',
        status: 'Active'
    }))
    const [loading, setLoading] = useState(true)

    const fetchProfile = useCallback(async () => {
        if (isDemo) {
            setProfile((prev) => ({
                ...prev,
                id: 'demo-merchant',
                name: 'Servora Demo Kitchen',
                business_name: 'Servora Demo Kitchen',
                address: '',
                phone: '',
                gstin: '',
                gstEnabled: false,
                gstRate: 0,
                gstLabel: 'GST',
            }))
            setLoading(false)
            return
        }

        try {
            let data = null
            if (restaurantId && restaurantId !== 'guest') {
                let q = supabase.from('restaurants').select('*')
                if (restaurantId.includes('@')) {
                    q = q.eq('email', restaurantId.toLowerCase()).maybeSingle()
                } else if (isUUID(restaurantId)) {
                    q = q.eq('id', restaurantId).maybeSingle()
                } else {
                    q = null
                }
                if (q) {
                    const { data: directData } = await q
                    if (directData) data = directData
                }
            }

            if (!data) {
                data = await getMyRestaurant()
            }

            if (data) {
                let gst = null
                try {
                    gst = await fetchGstSettings(data.id)
                } catch {
                    // optional GST settings lookup
                }

                const resolvedGstin = String(
                    data.gstin || gst?.gstin || readLocalGstin(data.id) || ''
                ).trim().toUpperCase()

                setProfile({
                    ...data,
                    name: (data.business_name || data.name || '').trim() || 'Restaurant',
                    business_name: (data.business_name || data.name || '').trim() || 'Restaurant',
                    address: (data.address || '').trim(),
                    phone: (data.phone || '').trim(),
                    gstin: resolvedGstin,
                    gstEnabled: Boolean(gst?.enabled),
                    gstRate: Number(gst?.rate || 0),
                    gstLabel: gst?.label || 'GST',
                })
            }
        } catch (error) {
            console.error('Error fetching restaurant profile from Supabase:', error)
        } finally {
            setLoading(false)
        }
    }, [restaurantId, isDemo])

    useEffect(() => {
        fetchProfile()

        const handleSync = () => {
            fetchProfile()
        }
        window.addEventListener('restaurantProfileUpdated', handleSync)
        window.addEventListener('gstSettingsUpdated', handleSync)
        return () => {
            window.removeEventListener('restaurantProfileUpdated', handleSync)
            window.removeEventListener('gstSettingsUpdated', handleSync)
        }
    }, [fetchProfile])

    const updateProfile = async (newProfile) => {
        try {
            // If we have an ID, we can update via API
            if (profile.id) {
                const updated = await updateRestaurantProfile(profile.id, newProfile)
                setProfile(prev => ({ ...prev, ...updated, name: updated.business_name || updated.name }))
                return true
            }
            return false
        } catch (error) {
            console.error('Error updating restaurant profile:', error)
            return false
        }
    }

    return {
        profile,
        loading,
        updateProfile
    }
}
