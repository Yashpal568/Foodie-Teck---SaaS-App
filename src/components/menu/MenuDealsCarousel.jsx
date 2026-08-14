import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronLeft, ChevronRight, Flame, ArrowRight, Plus, Star } from 'lucide-react'
import { formatPrice } from '@/components/ui/currency-selector'

export default function MenuDealsCarousel({ items = [], onSelectCategory, onAddToCart }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [direction, setDirection] = useState(1)

  // 🥘 Dynamically build carousel slides directly from live menu items
  const slides = useMemo(() => {
    if (!items || items.length === 0) return []

    // Filter items with valid real food photos
    const validItems = items.filter(
      i => i && (i.photo || i.photo_url || i.image_url || i.image || i.imageUrl) && i.isInStock !== false
    )

    const pool = validItems.length > 0 ? validItems : items

    // Pick signature items across different categories
    const categoriesCovered = new Set()
    const curated = []

    for (const item of pool) {
      if (!categoriesCovered.has(item.category) && curated.length < 5) {
        categoriesCovered.add(item.category)
        curated.push(item)
      }
    }

    // Fill up to 5 items if more exist
    if (curated.length < 4) {
      for (const item of pool) {
        if (!curated.find(c => (c._id && c._id === item._id) || (c.id && c.id === item.id)) && curated.length < 5) {
          curated.push(item)
        }
      }
    }

    const badgeThemes = [
      { badge: 'CHEF RECOMMENDS', badgeColor: 'bg-amber-500 text-slate-950 font-black', bgGradient: 'from-amber-950/90 via-slate-900/90 to-zinc-950', accentColor: 'text-amber-400', tag: 'BESTSELLER' },
      { badge: 'TODAY’S SPECIAL', badgeColor: 'bg-rose-500 text-white font-black', bgGradient: 'from-rose-950/90 via-slate-900/90 to-zinc-950', accentColor: 'text-rose-400', tag: 'MUST TRY' },
      { badge: 'POPULAR CHOICE', badgeColor: 'bg-emerald-500 text-slate-950 font-black', bgGradient: 'from-emerald-950/90 via-slate-900/90 to-zinc-950', accentColor: 'text-emerald-400', tag: 'SIGNATURE' },
      { badge: 'HOUSE FAVORITE', badgeColor: 'bg-orange-500 text-slate-950 font-black', bgGradient: 'from-orange-950/90 via-slate-900/90 to-zinc-950', accentColor: 'text-orange-400', tag: 'TOP RATED' },
      { badge: 'GOURMET PICK', badgeColor: 'bg-indigo-500 text-white font-black', bgGradient: 'from-indigo-950/90 via-slate-900/90 to-zinc-950', accentColor: 'text-indigo-400', tag: 'SPECIALTY' }
    ]

    return curated.map((item, idx) => {
      const theme = badgeThemes[idx % badgeThemes.length]
      const img = item.photo || item.photo_url || item.image_url || item.image || item.imageUrl || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'
      
      return {
        id: item._id || item.id || `slide-${idx}`,
        badge: theme.badge,
        badgeColor: theme.badgeColor,
        title: item.name,
        subtitle: item.description || `Freshly crafted ${item.category} prepared with authentic spices and fresh ingredients.`,
        price: item.price,
        tag: theme.tag,
        categoryTarget: item.category,
        image: img,
        bgGradient: theme.bgGradient,
        accentColor: theme.accentColor,
        rawItem: item
      }
    })
  }, [items])

  // Auto-play timer (5 seconds)
  useEffect(() => {
    if (isPaused || slides.length <= 1) return
    const timer = setInterval(() => {
      setDirection(1)
      setCurrentIndex(prev => (prev + 1) % slides.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [isPaused, slides.length])

  // Guard: If no slides, return null
  if (slides.length === 0) return null

  // Ensure currentIndex is in bounds
  const safeIndex = currentIndex % slides.length
  const slide = slides[safeIndex]

  const handleNext = (e) => {
    e?.stopPropagation()
    setDirection(1)
    setCurrentIndex(prev => (prev + 1) % slides.length)
  }

  const handlePrev = (e) => {
    e?.stopPropagation()
    setDirection(-1)
    setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length)
  }

  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.98
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.3 }
      }
    },
    exit: (dir) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
      scale: 0.98,
      transition: {
        x: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.25 }
      }
    })
  }

  return (
    <div 
      className="relative w-full rounded-[2rem] sm:rounded-[2.4rem] overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.12)] select-none group border border-zinc-200/80 bg-zinc-950"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* 🎠 CAROUSEL SLIDE CONTAINER */}
      <div 
        className="relative h-52 sm:h-56 md:h-60 w-full overflow-hidden cursor-pointer"
        onClick={() => {
          if (onSelectCategory && slide.categoryTarget) {
            onSelectCategory(slide.categoryTarget)
          }
        }}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={slide.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 w-full h-full flex"
          >
            {/* 🌟 1. RIGHT SIDE: 100% CRYSTAL CLEAR FULL-BRIGHTNESS FOOD PHOTOGRAPHY */}
            <div className="absolute right-0 top-0 bottom-0 w-[55%] sm:w-[50%] h-full overflow-hidden z-0">
              <img 
                src={slide.image} 
                alt={slide.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                crossOrigin="anonymous"
              />
              {/* Soft left feather so text transitions seamlessly into the bright image */}
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/40 to-transparent" />
            </div>

            {/* 🌟 2. LEFT SIDE: RICH INFORMATION & ACTION DETAILS */}
            <div className="relative z-10 w-[80%] sm:w-[65%] h-full p-4 sm:p-6 sm:pl-7 flex flex-col justify-between bg-gradient-to-r from-zinc-950 via-zinc-950/95 to-transparent">
              
              {/* Top Tag & Rating Pill */}
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs ${slide.badgeColor}`}>
                  {slide.badge}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/15 backdrop-blur-md text-white px-2 py-1 rounded-full border border-white/10 flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>{slide.tag}</span>
                </span>
              </div>

              {/* Real Menu Item Name & Description */}
              <div className="space-y-1 my-auto pr-4">
                <h3 className="text-base sm:text-xl md:text-2xl font-black text-white tracking-tight leading-tight flex items-center gap-2 drop-shadow-sm">
                  <span>{slide.title}</span>
                  <Sparkles className={`w-4 h-4 ${slide.accentColor} shrink-0 hidden sm:inline-block`} />
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-300 font-medium line-clamp-2 max-w-sm leading-relaxed">
                  {slide.subtitle}
                </p>
              </div>

              {/* Action Button & Live Menu Price Pill */}
              <div className="flex items-center gap-3 pt-1">
                {onAddToCart ? (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddToCart(slide.rawItem)
                    }}
                    className="bg-white text-zinc-900 hover:bg-zinc-100 active:scale-95 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                    <span>ADD • {formatPrice ? formatPrice(slide.price) : `₹${slide.price}`}</span>
                  </button>
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onSelectCategory && slide.categoryTarget) {
                        onSelectCategory(slide.categoryTarget)
                      }
                    }}
                    className="bg-white text-zinc-900 hover:bg-zinc-100 active:scale-95 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl transition-all cursor-pointer"
                  >
                    <span>ORDER • {formatPrice ? formatPrice(slide.price) : `₹${slide.price}`}</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                )}
              </div>

            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ⬅️ PREV / NEXT CHEVRON NAVIGATION */}
      {slides.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="Previous Slide"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 shadow-md cursor-pointer hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            onClick={handleNext}
            aria-label="Next Slide"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 shadow-md cursor-pointer hover:scale-105 active:scale-95"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* 🔘 PAGINATION DOT INDICATORS (Top Right position for clean separation) */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/20 shadow-sm">
            {slides.map((s, index) => (
              <button
                key={s.id}
                onClick={(e) => {
                  e.stopPropagation()
                  setDirection(index > safeIndex ? 1 : -1)
                  setCurrentIndex(index)
                }}
                aria-label={`Go to slide ${index + 1}`}
                className={`transition-all duration-300 rounded-full h-1.5 ${
                  index === safeIndex 
                    ? 'w-4 bg-white shadow-xs' 
                    : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
