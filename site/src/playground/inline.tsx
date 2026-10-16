/** Text where `backticked` parts are code. */
export function Inline(props: { text: string }) {
  return (
    <>
      {props.text
        .split("`")
        .map((part, index) => (index % 2 ? <code>{part}</code> : part))}
    </>
  );
}
