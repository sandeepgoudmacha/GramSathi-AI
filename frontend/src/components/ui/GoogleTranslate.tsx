import React, { useEffect } from 'react'

declare global {
  interface Window { google?: any; googleTranslateElementInit?: () => void }
}

export default function GoogleTranslate() {
  useEffect(() => {
    // Provide the callback for the Google Translate script
    window.googleTranslateElementInit = function () {
      try {
        if (!window.google || !window.google.translate) return
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          autoDisplay: false,
          includedLanguages: 'af,sq,am,ar,hy,az,eu,be,bn,bs,bg,ca,ceb,zh-CN,zh-TW,co,hr,cs,da,nl,en,eo,et,fi,fr,fy,gl,ka,de,el,gu,ht,ha,haw,he,hi,hmn,hu,is,ig,id,ga,it,ja,jw,kn,kk,km,rw,ko,ku,ky,lo,la,lv,lt,lb,mk,mg,ms,ml,mt,mi,mr,mn,my,ne,no,ny,or,ps,fa,pl,pt,pa,ro,ru,sm,gd,sr,st,sd,si,sk,sl,so,es,su,sw,sv,tg,ta,tt,te,th,tr,tk,uk,ur,ug,uz,vi,cy,xh,yi,yo,zu'
        }, 'google_translate_element')
      } catch (e) {
        console.warn('googleTranslate init failed', e)
      }
    }

    // Avoid adding the script multiple times
    const existing = document.querySelector('script[src*="translate_a/element.js"]')
    if (!existing) {
      const s = document.createElement('script')
      s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      s.async = true
      s.defer = true
      s.setAttribute('data-google-translate', '1')
      s.onerror = () => console.warn('Failed to load Google Translate script')
      document.body.appendChild(s)
    } else {
      // If script already present, call init directly (script may have loaded earlier)
      if ((window as any).google && (window as any).google.translate) {
        try { window.googleTranslateElementInit && window.googleTranslateElementInit() } catch (e) {}
      }
    }

    return () => {
      // Do not remove the script element on unmount to avoid flicker if component remounts
    }
  }, [])

  return (
    <div className="ml-2" aria-hidden>
      <div id="google_translate_element" className="text-xs" />
    </div>
  )
}
