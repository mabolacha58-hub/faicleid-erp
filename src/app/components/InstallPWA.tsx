import { useEffect, useState } from "react";
import { Download, X, Monitor } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPWA() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      // Mostrar banner após 3 segundos
      setTimeout(() => setShow(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShow(false);
      setPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setShow(false);
    }
  };

  // Já instalado ou sem suporte — não mostrar nada
  if (installed || !show || !prompt) return null;

  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: "#0d1117", border: "1px solid #6366f1",
      borderRadius: 14, padding: "16px 20px", zIndex: 9999,
      boxShadow: "0 8px 32px rgba(99,102,241,0.25)",
      display: "flex", alignItems: "center", gap: 16,
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      maxWidth: 420, width: "calc(100% - 48px)",
      animation: "slideUp 0.3s ease",
    }}>
      <style>{`@keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }`}</style>

      <div style={{ width: 42, height: 42, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Monitor style={{ width: 20, height: 20, color: "white" }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
          Instalar FaiCleid ERP
        </p>
        <p style={{ fontSize: 11, color: "#4a5568", margin: "2px 0 0" }}>
          Instale no desktop para acesso rápido sem browser
        </p>
      </div>

      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={handleInstall}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "#6366f1", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          <Download style={{ width: 13, height: 13 }} />
          Instalar
        </button>
        <button onClick={() => setShow(false)}
          style={{ background: "none", border: "1px solid #1a2035", borderRadius: 8, padding: "8px", cursor: "pointer", color: "#4a5568", display: "flex", alignItems: "center" }}>
          <X style={{ width: 13, height: 13 }} />
        </button>
      </div>
    </div>
  );
}