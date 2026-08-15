import { useState, useEffect } from 'react'
import { getMyRestaurant, updateRestaurantProfile, supabase } from '@/lib/api'

/**
 * Hook to manage restaurant profile information via Supabase
 */
export const useRestaurantProfile = (restaurantId) => {
    const [profile, setProfile] = useState({
        id: null,
        name: 'Tiger Bistro',
        business_name: 'Tiger Bistro',
        address: 'Main Square Mall, Floor 2',
        phone: '+91 98765 43210',
        description: 'Premium Dining Experience',
        plan: 'Basic'
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let data = await getMyRestaurant()
                if (!data && restaurantId && restaurantId !== 'guest') {
                    let q = supabase.from('restaurants').select('*')
                    if (restaurantId.includes('@')) {
                        q = q.eq('email', restaurantId.toLowerCase()).maybeSingle()
                    } else {
                        q = q.eq('id', restaurantId).maybeSingle()
                    }
                    const { data: directData } = await q
                    if (directData) data = directData
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
    }, [restaurantId])

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
