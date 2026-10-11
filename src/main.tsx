import { createRoot } from "react-dom/client";
import { QueryProvider } from "./app/QueryProvider";
import ErrorBoundary from "./app/components/ErrorBoundary";
import App from "./app/App.tsx";
import "./styles/index.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[PWA] Service Worker registado:", reg.scope);
      })
      .catch((err) => {
        console.warn("[PWA] Erro ao registar Service Worker:", err);
      });
  });
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <ErrorBoundary>
      <QueryProvider>
        <App />
      </QueryProvider>
    </ErrorBoundary>
  );
} else {
  console.error("Elemento #root não encontrado");
}