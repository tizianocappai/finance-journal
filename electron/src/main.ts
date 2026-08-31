import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { initDatabase, getDbPath } from './db/index';
import { registerLookupHandlers, registerExportImportHandlers, registerImpostazioniHandlers, registerPatrimonioHandlers } from './ipc/index';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

function createWindow(): void {
  const iconPath = path.join(
    app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', '..', 'assets', 'icons'),
    process.platform === 'darwin' ? 'icon.icns' : 'icon_256x256.png',
  );
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL).catch(console.error);
  } else {
    mainWindow
      .loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      )
      .catch(console.error);
  }
}

app.whenReady().then(() => {
  let db;
  try {
    db = initDatabase();
  } catch (err) {
    console.error('Failed to initialize database:', err);
    app.quit();
    return;
  }

  const dbPath = getDbPath();
  registerLookupHandlers(ipcMain, db);
  registerExportImportHandlers(ipcMain, db, dbPath);
  registerImpostazioniHandlers(ipcMain, db, dbPath);
  registerPatrimonioHandlers(ipcMain, db);

  try {
    createWindow();
  } catch (err) {
    console.error('Failed to create window:', err);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      try {
        createWindow();
      } catch (err) {
        console.error('Failed to create window on activate:', err);
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
