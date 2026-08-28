import { contextBridge } from 'electron';

try {
  contextBridge.exposeInMainWorld('electronAPI', {
    // IPC channels tipizzati aggiunti qui per ADR 0004
  });
} catch (err) {
  console.error('Failed to expose contextBridge API:', err);
}
