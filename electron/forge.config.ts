import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import path from 'path';

const ICONS_DIR = path.join(__dirname, 'assets', 'icons');

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'No Budget',
    appBundleId: 'app.nobudget',
    icon: path.join(ICONS_DIR, 'icon'),
    appCopyright: `Copyright © ${new Date().getFullYear()} No Budget`,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: 'NoBudget',
        // setupIcon requires icon.ico — generate with ImageMagick: convert icon_256x256.png icon.ico
        setupIcon: path.join(ICONS_DIR, 'icon.ico'),
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {
        name: 'No Budget',
        icon: path.join(ICONS_DIR, 'icon.icns'),
        format: 'ULFO',
      },
    },
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {
        options: {
          name: 'no-budget',
          productName: 'No Budget',
          icon: path.join(ICONS_DIR, 'icon_256x256.png'),
          maintainer: 'Tiziano Cappai',
          homepage: 'https://github.com/tizianocappai/finance-journal',
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      platforms: ['linux'],
      config: {
        options: {
          name: 'no-budget',
          productName: 'No Budget',
          icon: path.join(ICONS_DIR, 'icon_256x256.png'),
          homepage: 'https://github.com/tizianocappai/finance-journal',
        },
      },
    },
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
};

export default config;
