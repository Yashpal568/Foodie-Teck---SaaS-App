
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import CustomerMenu from './pages/CustomerMenu'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/menu" element={<CustomerMenu />} />
        <Route path="/" element={<div className="flex min-h-svh flex-col items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Foodie-Tech</h1>
            <p className="text-gray-600 mb-6">Restaurant Management System</p>
            <div className="flex gap-4 justify-center">
              <a href="/dashboard" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                Restaurant Dashboard
              </a>
              <a href="/menu?restaurant=restaurant-123&table=1" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                View Menu
              </a>
            </div>
          </div>
        </div>} />
        {/* Catch-all route for debugging */}
        <Route path="*" element={<div className="flex min-h-svh flex-col items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
            <p className="text-gray-600 mb-6">The page you're looking for doesn't exist.</p>
            <div className="flex gap-4 justify-center">
              <a href="/" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                Go Home
              </a>
              <a href="/dashboard" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                Dashboard
              </a>
            </div>
          </div>
        </div>} />
      </Routes>
    </Router>
  )
}
export default App