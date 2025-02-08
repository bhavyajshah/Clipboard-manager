import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('clipboardAPI', {
  setClipboard: (content: string) => ipcRenderer.invoke('set-clipboard', content),
  onClipboardUpdate: (callback: (content: string) => void) => {
    ipcRenderer.on('clipboard-updated', (_event, content) => callback(content))
    return () => ipcRenderer.removeListener('clipboard-updated', callback)
  }
})