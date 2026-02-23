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
        bch: {
          green: "#0AC18E",
          "green-dark": "#089B72",
          "green-light": "#0ED9A0",
        },
      },
    },
  },
  plugins: [],
};
export default config;
