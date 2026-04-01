import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PoemWorkshop } from "../features/poem-workshop/ui/PoemWorkshop";
import "../index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PoemWorkshop />
  </StrictMode>
);
