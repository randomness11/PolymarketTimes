import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-playfair)', 'serif'],
                serif: ['var(--font-garamond)', 'serif'],
                display: ['var(--font-playfair)', 'serif'],
                blackletter: ['var(--font-unifraktur)', 'serif'],
                body: ['var(--font-garamond)', 'serif'],
            },
            colors: {
                background: "#f4f1ea", // Newsprint off-white
                foreground: "#1a1a1a", // Ink black
                paper: "#f4f1ea",
                ink: "#1a1a1a",
            },
            backgroundImage: {
                'paper-texture': "url('https://www.transparenttextures.com/patterns/cream-paper.png')",
            }
        },
    },
    plugins: [],
};
export default config;
