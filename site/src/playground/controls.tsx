import { For, Show } from "solid-js";

import { num } from "./format";
import type { Control, Params, ParamValue } from "./params";

export function Controls<P extends Params>(props: {
  demo: string;
  controls: Control<P>[];
  values: P;
  onChange: (key: keyof P & string, value: ParamValue) => void;
}) {
  return (
    <div class="controls">
      <For each={props.controls}>
        {(control) => (
          <Show when={control.show?.(props.values) ?? true}>
            <Field
              demo={props.demo}
              control={control}
              values={props.values}
              onChange={props.onChange}
            />
          </Show>
        )}
      </For>
    </div>
  );
}

function Field<P extends Params>(props: {
  demo: string;
  control: Control<P>;
  values: P;
  onChange: (key: keyof P & string, value: ParamValue) => void;
}) {
  const control = props.control;
  const id = `control-${props.demo}-${control.key}`;
  const current = () => props.values[control.key];

  if (control.kind === "range") {
    return (
      <div class="field">
        <label for={id}>{control.label}</label>
        <output for={id}>
          {num(Number(current()))}
          {control.unit ?? ""}
        </output>
        <input
          id={id}
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={Number(current())}
          onInput={(event) =>
            props.onChange(control.key, event.currentTarget.valueAsNumber)
          }
        />
      </div>
    );
  }
  if (control.kind === "select") {
    return (
      <div class="field">
        <label for={id}>{control.label}</label>
        <select
          id={id}
          value={String(current())}
          onChange={(event) =>
            props.onChange(control.key, event.currentTarget.value)
          }
        >
          <For each={control.options}>
            {(option) => <option value={option}>{option}</option>}
          </For>
        </select>
      </div>
    );
  }
  return (
    <div class="field toggle">
      <input
        id={id}
        type="checkbox"
        checked={current() === true}
        onChange={(event) =>
          props.onChange(control.key, event.currentTarget.checked)
        }
      />
      <label for={id}>{control.label}</label>
    </div>
  );
}
