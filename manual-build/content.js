// Simplified content script
console.log("Annotated Manual Build injected");

window.addEventListener("mouseup", () => {
  const selection = window.getSelection().toString().trim();
  if (selection) {
    console.log("Annotating:", selection);
    // You could show a simple UI here
  }
});
