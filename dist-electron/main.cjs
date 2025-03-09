"use strict";
const electron = require("electron");
const path = require("path");
const url = require("url");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const __filename$1 = url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.cjs", document.baseURI).href);
const __dirname$1 = path.dirname(__filename$1);
let win = null;
let previousClipboardContent = "";
let clipboardMonitorInterval = null;
function createWindow() {
  const { width: screenWidth, height: screenHeight } = electron.screen.getPrimaryDisplay().workAreaSize;
  win = new electron.BrowserWindow({
    width: 400,
    height: 600,
    x: screenWidth - 420,
    y: screenHeight - 620,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname$1, "../dist-electron/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
  win.on("blur", () => {
    win == null ? void 0 : win.hide();
  });
  win.webContents.on("did-finish-load", () => {
    console.log("Window loaded and ready");
  });
  return win;
}
function stopClipboardMonitor() {
  if (clipboardMonitorInterval) {
    clearInterval(clipboardMonitorInterval);
    clipboardMonitorInterval = null;
  }
}
function startClipboardMonitor() {
  stopClipboardMonitor();
  clipboardMonitorInterval = setInterval(() => {
    try {
      if (!win) return;
      const currentContent = electron.clipboard.readText();
      if (currentContent && currentContent !== previousClipboardContent) {
        console.log("New clipboard content detected");
        previousClipboardContent = currentContent;
        if (win.webContents.isLoading()) {
          console.log("Window still loading, waiting...");
          return;
        }
        win.webContents.send("clipboard-updated", currentContent);
        console.log("Sent clipboard update to renderer");
      }
    } catch (error) {
      console.error("Error monitoring clipboard:", error);
    }
  }, 500);
}
electron.app.whenReady().then(() => {
  win = createWindow();
  win.webContents.on("did-finish-load", () => {
    console.log("Starting clipboard monitor");
    startClipboardMonitor();
    const initialContent = electron.clipboard.readText();
    if (initialContent) {
      win == null ? void 0 : win.webContents.send("clipboard-updated", initialContent);
    }
  });
  electron.globalShortcut.register("CommandOrControl+Alt+H", () => {
    if (win == null ? void 0 : win.isVisible()) {
      win.hide();
    } else {
      win == null ? void 0 : win.show();
      win == null ? void 0 : win.focus();
      const currentContent = electron.clipboard.readText();
      if (currentContent && currentContent !== previousClipboardContent) {
        previousClipboardContent = currentContent;
        win == null ? void 0 : win.webContents.send("clipboard-updated", currentContent);
      }
    }
  });
  electron.ipcMain.handle("paste-content", async (_event, content) => {
    try {
      const activeWin = electron.BrowserWindow.getFocusedWindow();
      electron.clipboard.writeText(content);
      win == null ? void 0 : win.hide();
      if (activeWin) {
        activeWin.webContents.paste();
      }
    } catch (error) {
      console.error("Error pasting content:", error);
    }
  });
  electron.ipcMain.handle("set-clipboard", (_event, content) => {
    try {
      electron.clipboard.writeText(content);
    } catch (error) {
      console.error("Error setting clipboard:", error);
    }
  });
});
electron.app.on("window-all-closed", () => {
  stopClipboardMonitor();
  if (process.platform !== "darwin") {
    electron.app.quit();
    win = null;
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    win = createWindow();
    win.webContents.on("did-finish-load", () => {
      startClipboardMonitor();
    });
  }
});
electron.app.on("will-quit", () => {
  stopClipboardMonitor();
  electron.globalShortcut.unregisterAll();
});
