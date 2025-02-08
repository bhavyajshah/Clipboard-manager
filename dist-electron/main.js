import { app, globalShortcut, ipcMain, clipboard, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let win = null;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: true
    },
    show: false
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(join(__dirname, "../dist/index.html"));
  }
  return win;
}
let previousClipboardContent = "";
function monitorClipboard() {
  setInterval(() => {
    const currentContent = clipboard.readText();
    if (currentContent && currentContent !== previousClipboardContent) {
      previousClipboardContent = currentContent;
      win == null ? void 0 : win.webContents.send("clipboard-updated", currentContent);
    }
  }, 500);
}
app.whenReady().then(() => {
  createWindow();
  win == null ? void 0 : win.show();
  monitorClipboard();
  globalShortcut.register("Alt+Space", () => {
    if (win == null ? void 0 : win.isVisible()) {
      win.hide();
    } else {
      win == null ? void 0 : win.show();
      win == null ? void 0 : win.focus();
    }
  });
  ipcMain.handle("set-clipboard", (_event, content) => {
    clipboard.writeText(content);
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
