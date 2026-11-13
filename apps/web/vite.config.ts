import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
	build: {
		chunkSizeWarningLimit: 900,
		rollupOptions: {
			output: {
				manualChunks: {
					react: ["react", "react-dom", "react-router", "react-redux", "@reduxjs/toolkit"],
					mui: ["@mui/material", "@emotion/react", "@emotion/styled"],
					"mui-x": ["@mui/x-charts", "@mui/x-date-pickers"],
					table: ["material-react-table"],
				},
			},
		},
	},
	server: {
		port: 5173,
		proxy: { "/api": { target: process.env.VITE_API_PROXY ?? "http://localhost:3333", changeOrigin: true } },
	},
});
