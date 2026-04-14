import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
build: {
rollupOptions: {
output: {
manualChunks: {
katex: ['katex'],
docx: ['docx'],
vendor: ['react', 'react-dom', 'react-router-dom'],
// Thêm dòng này để tách riêng các thư viện liên quan đến Google AI
googleAi: ['@google/generative-ai'],
},
},
},
// Tăng giới hạn lên 1600 để hết cảnh báo màu vàng
chunkSizeWarningLimit: 1600,
},
server: {
host: "::",
port: 8080,
hmr: {
overlay: false,
},
},
plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
resolve: {
alias: {
"@": path.resolve(__dirname, "./src"),
},
dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
},
}));
