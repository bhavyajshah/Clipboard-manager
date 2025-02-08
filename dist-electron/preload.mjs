"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("clipboardAPI", {
  setClipboard: (content) => electron.ipcRenderer.invoke("set-clipboard", content),
  onClipboardUpdate: (callback) => {
    electron.ipcRenderer.on("clipboard-updated", (_event, content) => callback(content));
    return () => electron.ipcRenderer.removeListener("clipboard-updated", callback);
  }
});
