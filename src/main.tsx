import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
const container = document.getElementById("root")!;
if (container.hasChildNodes()) ReactDOM.hydrateRoot(container, app);
else ReactDOM.createRoot(container).render(app);
