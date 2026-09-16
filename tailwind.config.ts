/** @type {import('tailwindcss').Config} */
module.exports = {
  corePlugins: {
    preflight: false,
  },
  content: ["./pages/**/*.{html,ts,tsx,mdx}", "./components/**/*.{ts,tsx,mdx}", "./utils/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {},
  },
  darkMode: "class",
};
