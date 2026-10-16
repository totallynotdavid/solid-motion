/** @jsxImportSource react */
import { motion } from "motion/react";
import { useState } from "react";

import { transitionOf } from "../playground/params";
import { tabs, type TabsParams } from "./tabs.config";

export default function Tabs({ p }: { p: TabsParams }) {
  const [active, setActive] = useState("Home");
  return (
    <nav className="tabbar" data-origin>
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className="tab"
          onClick={() => setActive(tab)}
        >
          {tab}
          {active === tab ? (
            <motion.span
              className="underline"
              data-probe
              layoutId="underline"
              transition={transitionOf(p)}
            />
          ) : null}
        </button>
      ))}
    </nav>
  );
}
