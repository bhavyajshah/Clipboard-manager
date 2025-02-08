import { app, globalShortcut, ipcMain, clipboard, BrowserWindow, Tray, Menu } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win = null;
let tray = null;
function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    // icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: true,
      contextIsolation: true
    },
    show: false
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  return win;
}
function setupTray() {
  tray = new Tray(path.join(process.env.VITE_PUBLIC, "electron-vite.svg"));
  const contextMenu = Menu.buildFromTemplate([
    { label: "Show", click: () => win == null ? void 0 : win.show() },
    { label: "Quit", click: () => app.quit() }
  ]);
  tray.setToolTip("Clipboard Manager");
  tray.setContextMenu(contextMenu);
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
  setupTray();
  monitorClipboard();
  globalShortcut.register("Alt+CommandOrControl+F", () => {
    if (win == null ? void 0 : win.isVisible()) {
      win.hide();
    } else {
      win == null ? void 0 : win.show();
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
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
