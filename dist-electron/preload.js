"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("clipboardAPI", {
  setClipboard: (content) => electron.ipcRenderer.invoke("set-clipboard", content),
  pasteContent: (content) => electron.ipcRenderer.invoke("paste-content", content),
  onClipboardUpdate: (callback) => {
    const handler = (_event, content) => callback(content);
    electron.ipcRenderer.on("clipboard-updated", handler);
    return () => {
      electron.ipcRenderer.removeListener("clipboard-updated", handler);
    };
  }
});
