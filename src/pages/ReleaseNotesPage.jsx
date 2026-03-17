import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReleaseNotes from '../components/dashboard/ReleaseNotes'

export default function ReleaseNotesPage() {
  const navigate = useNavigate()
  const [activeItem, setActiveItem] = useState('dashboard')

  return (
    <div className="h-screen w-full">
      <ReleaseNotes 
        activeItem={activeItem}
        setActiveItem={(item) => {
          if (item === 'dashboard') navigate('/dashboard')
          else setActiveItem(item)
        }}
        navigate={navigate}
      />
    </div>
  )
}
