/**
 * Wires the Copy buttons in rendered Markdown. The buttons arrive as HTML, so
 * one listener on the document handles them all.
 */
export function startProseCopy(): void {
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(".prose button.copy");
    const text = button?.parentElement?.querySelector("pre")?.textContent;
    if (!button || text == null) return;
    void copy(button, text);
  });
}

async function copy(button: Element, text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
  button.textContent = "Copied";
  button.setAttribute("data-copied", "true");
  setTimeout(() => {
    button.textContent = "Copy";
    button.removeAttribute("data-copied");
  }, 1600);
}
