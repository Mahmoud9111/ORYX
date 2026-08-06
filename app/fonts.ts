import localFont from 'next/font/local'

// Single typeface for the whole site. The file lives in `public/`; the `src`
// path is resolved relative to this file, not to the URL it is served from.
export const lamaSans = localFont({
  src: '../public/LamaSans-ExtraBold.otf',
  variable: '--font-lama',
  weight: '800',
  style: 'normal',
  display: 'swap',
})
