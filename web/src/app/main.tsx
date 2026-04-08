import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PoemWorkshop } from "@/poem-workshop/PoemWorkshop";
import { applyAppearance, loadAppearance } from "@/poem-workshop/appearance";
import { HoverHintsProvider } from "@/poem-workshop/HoverHintsContext";
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
