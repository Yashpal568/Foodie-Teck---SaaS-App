import { Outlet } from 'react-router-dom'
import MarketingNavbar from '@/components/marketing/MarketingNavbar'
import MarketingFooter from '@/components/marketing/MarketingFooter'
import { motion, AnimatePresence } from 'framer-motion'

export default function MarketingLayout() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-600 selection:text-white">
      <MarketingNavbar />
      
      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={window.location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <MarketingFooter />
    </div>
  )
}
