// src/components/public/BannerCarousel.jsx
import { useState, useEffect } from 'react'
import { useCompany } from '../../hooks/useCompany'

const INTERVAL = 5000

export default function BannerCarousel({ banners }) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused]   = useState(false)
  const { company } = useCompany()

  useEffect(() => {
    if (banners.length <= 1 || paused) return
    const t = setInterval(() => setCurrent(c => (c + 1) % banners.length), INTERVAL)
    return () => clearInterval(t)
  }, [banners.length, paused])

  const prev = () => setCurrent(c => (c - 1 + banners.length) % banners.length)
  const next = () => setCurrent(c => (c + 1) % banners.length)

  if (!banners.length) {
    return (
      <div className="relative overflow-hidden bg-brand min-h-[240px] md:min-h-[360px] flex items-center">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 0%, transparent 60%)' }} />
        <div className="relative w-full max-w-7xl mx-auto px-6 py-16 text-center text-white">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            {company?.name || 'Bienvenido'}
          </h1>
          <p className="text-lg opacity-80">{company?.description || 'Explora nuestro catálogo'}</p>
        </div>
      </div>
    )
  }

  const banner = banners[current]

  return (
    <div
      className="relative overflow-hidden min-h-[240px] md:min-h-[400px] lg:min-h-[500px] flex items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}>

      {/* Slides */}
      {banners.map((b, i) => (
        <div key={b.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
          <img src={b.image_url || b.image} alt={b.title || ''}
            className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none' }} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
        </div>
      ))}

      {/* Text content */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-20 text-white">
        <div key={current} className="animate-slide-up max-w-xl">
          {banner.title && (
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold mb-3 leading-tight">
              {banner.title}
            </h2>
          )}
          {banner.subtitle && (
            <p className="text-base md:text-xl opacity-90 mb-7 leading-relaxed">
              {banner.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Arrows */}
      {banners.length > 1 && (
        <>
          <button onClick={prev}
            className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/55 text-white flex items-center justify-center transition backdrop-blur-sm border border-white/10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={next}
            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/55 text-white flex items-center justify-center transition backdrop-blur-sm border border-white/10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots + progress bar */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 items-center">
          {banners.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'bg-white w-6 h-2' : 'bg-white/40 w-2 h-2 hover:bg-white/70'
              }`} />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {banners.length > 1 && !paused && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/15 z-20">
          <div
            key={`${current}-${paused}`}
            className="h-full bg-white/60"
            style={{ animation: `bannerProgress ${INTERVAL}ms linear forwards` }}
          />
        </div>
      )}
    </div>
  )
}
