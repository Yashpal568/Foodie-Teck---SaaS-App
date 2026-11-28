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

const readDemoGstSettings = () => {
    try {
        if (typeof window === 'undefined') return { enabled: false, rate: 0, label: 'GST', gstin: '' }
        const raw = window.localStorage.getItem('servora_demo_gst_settings')
        if (!raw) return { enabled: false, rate: 0, label: 'GST', gstin: '' }
        const parsed = JSON.parse(raw)
        return {
            enabled: Boolean(parsed?.enabled),
            rate: Number(parsed?.rate || 0),
            label: String(parsed?.label || 'GST'),
            gstin: String(parsed?.gstin || '').trim().toUpperCase(),
        }
    } catch {
        return { enabled: false, rate: 0, label: 'GST', gstin: '' }
    }
}

/**
 * Hook to manage restaurant profile + GST configuration via Supabase
 */
export const useRestaurantProfile = (restaurantId) => {
    const isDemo = restaurantId === 'demo-merchant' || restaurantId === 'demo' || restaurantId === 'guest'
    const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

    const [profile, setProfile] = useState(() => {
        const demoGst = isDemo ? readDemoGstSettings() : null
        return {
            id: restaurantId || null,
            name: isDemo ? 'Servora Demo Kitchen' : '',
            business_name: isDemo ? 'Servora Demo Kitchen' : '',
            email: '',
            address: '',
            phone: '',
            gstin: demoGst?.gstin || '',
            gstEnabled: Boolean(demoGst?.enabled),
            gstRate: Number(demoGst?.rate || 0),
            gstLabel: demoGst?.label || 'GST',
            description: 'Premium Dining Experience',
            plan: 'Professional',
            status: 'Active'
        }
    })
    const [loading, setLoading] = useState(true)

    const fetchProfile = useCallback(async () => {
        if (isDemo) {
            const demoGst = readDemoGstSettings()
            setProfile((prev) => ({
                ...prev,
                id: 'demo-merchant',
                name: 'Servora Demo Kitchen',
                business_name: 'Servora Demo Kitchen',
                address: '',
                phone: '',
                gstin: demoGst.gstin,
                gstEnabled: demoGst.enabled,
                gstRate: demoGst.rate,
                gstLabel: demoGst.label,
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

            if (!data && (!restaurantId || restaurantId === 'default')) {
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

        const handleSync = (e) => {
            if (isDemo && e?.type !== 'gstSettingsUpdated') return
            const detailRid = e?.detail?.restaurantId
            if (detailRid && restaurantId && detailRid !== restaurantId && detailRid !== profile?.id) {
                return
            }
            fetchProfile()
        }
        window.addEventListener('restaurantProfileUpdated', handleSync)
        window.addEventListener('gstSettingsUpdated', handleSync)
        return () => {
            window.removeEventListener('restaurantProfileUpdated', handleSync)
            window.removeEventListener('gstSettingsUpdated', handleSync)
        }
    }, [fetchProfile, isDemo, restaurantId, profile?.id])

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
