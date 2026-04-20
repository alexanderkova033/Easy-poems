import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { PoemWorkshop } from "@/workshop/shell/PoemWorkshop";
import { LandingPage } from "@/landing/LandingPage";
import { applyAppearance, loadAppearance } from "@/workshop/appearance/appearance";
import { HoverHintsProvider } from "@/workshop/hints/HoverHintsContext";
import { ToastProvider } from "@/shared/toast/ToastContext";
import { ErrorBoundary } from "@/app/ErrorBoundary";
import { STORAGE_KEY_LANDING_DISMISSED } from "@/shared/storage-keys";
import "@/app/index.css";

applyAppearance(loadAppearance());

function readLandingDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_LANDING_DISMISSED) === "1";
  } catch {
    return false;
  }
}

function App() {
  const [showWorkshop, setShowWorkshop] = useState(readLandingDismissed);

  const enter = () => {
    try {
      localStorage.setItem(STORAGE_KEY_LANDING_DISMISSED, "1");
    } catch {
      // ignore
    }
    setShowWorkshop(true);
  };

  if (!showWorkshop) {
    return <LandingPage onEnter={enter} />;
  }

  return (
    <ToastProvider>
      <HoverHintsProvider>
        <PoemWorkshop />
      </HoverHintsProvider>
    </ToastProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Analytics />
      <SpeedInsights />
    </ErrorBoundary>
  </StrictMode>
);