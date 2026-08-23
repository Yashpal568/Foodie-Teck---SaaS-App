import { useState, useEffect } from 'react'
import { getMyRestaurant, updateRestaurantProfile, supabase } from '@/lib/api'

/**
 * Hook to manage restaurant profile information via Supabase
 */
export const useRestaurantProfile = (restaurantId) => {
    const isDemo = restaurantId === 'demo-merchant' || restaurantId === 'demo' || restaurantId === 'guest'
    const isTiger = restaurantId === 'a3b0c97f-7acb-478b-8b5a-68763af06b5c' || restaurantId === 'tigerbistro99@gmail.com'
    const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

    const [profile, setProfile] = useState({
        id: restaurantId || 'a3b0c97f-7acb-478b-8b5a-68763af06b5c',
        name: 'Tiger Bistro',
        business_name: 'Tiger Bistro',
        email: 'tigerbistro99@gmail.com',
        address: 'Main Square Mall, Floor 2',
        phone: '+91 98765 43210',
        description: 'Premium Dining Experience',
        plan: 'Professional',
        status: 'Active'
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProfile = async () => {
            if (isDemo) {
                setLoading(false)
                return
            }

            try {
                let data = await getMyRestaurant()
                if (!data && restaurantId && restaurantId !== 'guest') {
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
                if (data) {
                    setProfile({
                        ...data,
                        name: data.business_name || data.name || 'Tiger Bistro'
                    })
                }
            } catch (error) {
                console.error('Error fetching restaurant profile from Supabase:', error)
            } finally {
                setLoading(false)
            }
        }
        
        fetchProfile()
    }, [restaurantId, isDemo])

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
