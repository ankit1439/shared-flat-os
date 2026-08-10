import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14110f",
        paper: "#f4f0ea",
        card: "#fffcf8",
        line: "#e6dfd4",
        mute: "#6f675e",
        home: "#1f7a4d",
        owe: "#b42318",
        get: "#18794e",
        wait: "#9a6700",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(20,17,15,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
