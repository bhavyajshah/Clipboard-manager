import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('clipboardAPI', {
  setClipboard: (content: string) => ipcRenderer.invoke('set-clipboard', content),
  pasteContent: (content: string) => ipcRenderer.invoke('paste-content', content),
  onClipboardUpdate: (callback: (content: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, content: string) => callback(content)
    ipcRenderer.on('clipboard-updated', handler)
    return () => {
      ipcRenderer.removeListener('clipboard-updated', handler)
    }
  }
})