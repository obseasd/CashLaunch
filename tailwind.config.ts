import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#12c89f",
          light: "#15dfb2",
          dark: "#0fa882",
          muted: "rgba(18, 200, 159, 0.15)",
        },
        surface: {
          0: "#060609",
          1: "#0c0d12",
          2: "#141520",
          3: "#1a1c28",
        },
        border: {
          DEFAULT: "#1e2030",
          hover: "#2a2d40",
        },
        text: {
          primary: "#f0f0f5",
          secondary: "#8b8da0",
          muted: "#4a4c5e",
        },
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
      },
    },
  },
  plugins: [],
};
export default config;
