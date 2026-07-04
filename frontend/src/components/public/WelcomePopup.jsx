// src/components/public/WelcomePopup.jsx
import { useState, useEffect } from 'react'
import useCompanyStore from '../../store/companyStore'

const SESSION_KEY = 'popup_shown'

export default function WelcomePopup() {
  const { company } = useCompanyStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!company) return
    if (!company.popup_active || company.popup_active == 0) return
    if (!company.popup_image_url) return
    if (sessionStorage.getItem(SESSION_KEY)) return

    sessionStorage.setItem(SESSION_KEY, '1')
    setVisible(true)
  }, [company])

  if (!visible) return null

  const close = () => setVisible(false)

  const content = (
    <img
      src={company.popup_image_url}
      alt="Promoción"
      className="w-full h-auto block"
    />
  )

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={close}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition text-lg leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>

        {/* Image — wrapped in link if popup_link is set */}
        {company.popup_link ? (
          <a
            href={company.popup_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
            className="block cursor-pointer"
          >
            {content}
          </a>
        ) : (
          <div className="cursor-default">{content}</div>
        )}
      </div>
    </div>
  )
}
