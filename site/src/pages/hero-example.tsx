import { motion } from "@totallynotdavid/solid-motion";
import { For } from "solid-js";

const list = { visible: { transition: { staggerChildren: 0.05 } } };
const tile = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

export const Tiles = (props: { items: string[] }) => (
  <motion.ul class="tiles" variants={list} initial="hidden" animate="visible">
    <For each={props.items}>
      {(item) => (
        <motion.li class="tile" variants={tile} whileHover={{ scale: 1.1 }}>
          {item}
        </motion.li>
      )}
    </For>
  </motion.ul>
);
