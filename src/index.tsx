import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "~/App";
// import store from "~/store";
import { CheckWebGPU } from "~/utils/helper/webgpu";

console.log(CheckWebGPU());
const root = createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
