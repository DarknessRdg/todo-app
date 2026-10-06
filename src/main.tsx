import { StrictMode } from "react";
import { MotionConfig } from "motion/react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* "user": under the OS reduced-motion setting, Motion drops movement
        (transforms, layout) and keeps only fades. Set once, here, so no
        animation in the app can forget to ask. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>
);
