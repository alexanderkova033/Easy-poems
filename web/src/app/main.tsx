import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PoemWorkshop } from "@/workshop/shell/PoemWorkshop";
import { applyAppearance, loadAppearance } from "@/workshop/appearance/appearance";
import { HoverHintsProvider } from "@/workshop/hints/HoverHintsContext";
import { ErrorBoundary } from "@/app/ErrorBoundary";
import "@/app/index.css";

applyAppearance(loadAppearance());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <HoverHintsProvider>
        <PoemWorkshop />
      </HoverHintsProvider>
    </ErrorBoundary>
  </StrictMode>
);
