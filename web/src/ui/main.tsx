import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PoemWorkshop } from "./poem-workshop/PoemWorkshop";
import "../index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PoemWorkshop />
  </StrictMode>
);
