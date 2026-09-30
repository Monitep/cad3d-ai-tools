/* CPython is loaded on demand; nothing is sent to a calculation service. */
"use strict";
let runtime;
self.onmessage = async ({ data }) => {
  try {
    if (!runtime) {
      self.postMessage({ type: "status", text: "loading" });
      importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js");
      runtime = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
      });
      runtime.setStdout({
        batched: (text) => self.postMessage({ type: "output", text }),
      });
      runtime.setStderr({
        batched: (text) => self.postMessage({ type: "output", text }),
      });
    }
    self.postMessage({ type: "status", text: "running" });
    const globals = runtime.toPy({});
    try {
      await runtime.runPythonAsync(data.code, { globals });
    } finally {
      globals.destroy();
    }
    self.postMessage({ type: "done" });
  } catch (e) {
    self.postMessage({ type: "error", text: String(e) });
  }
};
