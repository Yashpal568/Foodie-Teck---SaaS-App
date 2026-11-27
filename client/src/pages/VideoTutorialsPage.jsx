import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import VideoTutorials from '../components/dashboard/VideoTutorials'

export default function VideoTutorialsPage() {
  const navigate = useNavigate()
  const [activeItem, setActiveItem] = useState('dashboard')

  return (
    <div className="h-screen w-full">
      <VideoTutorials 
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
