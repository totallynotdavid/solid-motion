import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./styles.css";
import { render } from "@solidjs/web";

import { App } from "./app";
import { startProseCopy } from "./pages/prose-copy";
import { settleHash, startRouter } from "./router";

startRouter();
startProseCopy();
const root = document.getElementById("root");
if (root) {
  render(() => <App />, root);
  settleHash();
}
