import type { Demo } from "../playground/demo";
import config from "./config";
import drag from "./drag";
import draw from "./draw";
import entrance from "./entrance";
import follow from "./follow";
import hover from "./hover";
import keyframes from "./keyframes";
import overlap from "./overlap";
import path from "./path";
import presence from "./presence";
import rows from "./rows";
import scroll from "./scroll";
import sequence from "./sequence";
import stagger from "./stagger";
import switchDemo from "./switch";
import tabs from "./tabs";
import value from "./value";

export const demos: Demo[] = [
  entrance,
  keyframes,
  stagger,
  hover,
  drag,
  switchDemo,
  tabs,
  presence,
  rows,
  scroll,
  follow,
  draw,
  sequence,
  config,
  path,
  value,
  overlap,
];
