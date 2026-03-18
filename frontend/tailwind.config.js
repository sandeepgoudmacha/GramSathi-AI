export default {
  content: ['./index.html','./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#e8f7ef',100:'#d1f0e2',200:'#a3e1c5',300:'#5fcaa0',400:'#25a862',500:'#1a7a4a',600:'#155f3a',700:'#10472c',800:'#0b301e',900:'#061a10' }
      },
      fontFamily: { display: ['Syne','sans-serif'], body: ['Inter','sans-serif'] },
    },
  },
  plugins: [],
}
