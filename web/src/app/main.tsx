import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { PoemWorkshop } from "@/poem-workshop/PoemWorkshop";
import { applyAppearance, loadAppearance } from "@/poem-workshop/appearance";
import { ErrorBoundary } from "@/app/ErrorBoundary";
import "@/app/index.css";

applyAppearance(loadAppearance());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <PoemWorkshop />
      <Analytics />
    </ErrorBoundary>
  </StrictMode>
);
