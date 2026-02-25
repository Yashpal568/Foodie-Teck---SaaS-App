import { useState, useEffect } from 'react'

/**
 * Hook to manage restaurant profile information
 * In a real app, this would fetch from an API
 */
export const useRestaurantProfile = (restaurantId) => {
    const [profile, setProfile] = useState({
        name: 'FoodieTech',
        address: 'Main Square Mall, Floor 2',
        phone: '+91 98765 43210',
        description: 'Premium Dining Experience'
    })

    useEffect(() => {
        // Load from localStorage if available
        const savedProfile = localStorage.getItem(`restaurantProfile_${restaurantId}`)
        if (savedProfile) {
            try {
                setProfile(JSON.parse(savedProfile))
            } catch (error) {
                console.error('Error parsing restaurant profile:', error)
            }
        } else {
            // Save default profile if none exists
            localStorage.setItem(`restaurantProfile_${restaurantId}`, JSON.stringify(profile))
        }
    }, [restaurantId])

    const updateProfile = (newProfile) => {
        const updated = { ...profile, ...newProfile }
        setProfile(updated)
        localStorage.setItem(`restaurantProfile_${restaurantId}`, JSON.stringify(updated))
    }

    return {
        profile,
        updateProfile
    }
}
