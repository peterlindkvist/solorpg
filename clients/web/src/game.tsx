import React from "react";
import ReactDOM from "react-dom/client";
import GameContainer from "./GameContainer.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GameContainer />
  </React.StrictMode>
);
