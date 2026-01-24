
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<div className="flex min-h-svh flex-col items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Foodie-Tech</h1>
            <p className="text-gray-600 mb-6">Restaurant Management System</p>
            <a href="/dashboard" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Go to Dashboard
            </a>
          </div>
        </div>} />
      </Routes>
    </Router>
  )
}

export default App