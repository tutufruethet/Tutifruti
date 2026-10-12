'use client';

import { useSettingsStore } from '@/settings/store';
import { findWallpaper } from './wallpapers';

export function WallpaperLayer() {
  const id = useSettingsStore((state) => state.settings.wallpaper);
  const wallpaper = findWallpaper(id);
  return (
    <div aria-hidden data-wallpaper={wallpaper.id} className="absolute inset-0 overflow-hidden" style={wallpaper.style}>
      {wallpaper.wordmark ? (
        <span className="absolute -bottom-[0.18em] left-[-0.04em] select-none text-[24cqw] font-medium leading-none tracking-[-0.05em] text-paper/[0.035]">
          NEXUS
        </span>
      ) : null}
    </div>
  );
}
