import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PoemWorkshop } from "./poem-workshop/PoemWorkshop";
import { applyAppearance, loadAppearance } from "./preferences/appearance";
import "../index.css";

applyAppearance(loadAppearance());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PoemWorkshop />
  </StrictMode>
);
