/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brandGreen: "#2E7D32", // deep natural green
        brandLightGreen: "#A5D6A7", // light green accent
        brandBrown: "#8D6E63", // earthy brown
        brandYellow: "#F9A825", // golden yellow highlight
        brandCream: "#FFFDE7", // warm background
        brandGray: "#F1F8E9", // light green-gray background
        brandText: "#2F3E46", // dark readable text
      },
      fontFamily: {
        body: ["'Poppins'", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
