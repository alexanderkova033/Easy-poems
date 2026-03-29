import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PoemWorkshop } from "./poem-analysis/ui/PoemWorkshop";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PoemWorkshop />
  </StrictMode>
);
