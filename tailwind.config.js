/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bgSoft: "#F6FBF7",        // page background
        headerDark: "#1F5A3E",    // navbar
        primary: "#2F855A",       // main green accent
        accent: "#4FD1A9",        // lighter green
        earth: "#8B6E4E",         // warm earth accent
        cardBorder: "#E6F3ED",
        textDark: "#153233",
        muted: "#6B7280",
        stripe: "#E9F8F1",
      },
      fontFamily: {
        body: ["Inter", "sans-serif"],
        heading: ["Poppins", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 30px rgba(16, 24, 40, 0.06)",
      },
      keyframes: {
        floatIn: {
          "0%": { opacity: 0, transform: "translateY(18px) scale(0.995)" },
          "100%": { opacity: 1, transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        floatIn: "floatIn 0.45s ease-out both",
      },
    },
  },
  plugins: [],
};
