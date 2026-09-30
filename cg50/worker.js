"use strict";
importScripts("vendor/math.js", "vendor/jstat.js", "engine.js");
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ id: data.id, result: CGEngine.execute(data.payload) });
  } catch (e) {
    self.postMessage({ id: data.id, error: e.message || String(e) });
  }
};
