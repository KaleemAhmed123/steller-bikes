import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

// Asked once per page load and shared by every Upload button on the page.
// A failed check is not remembered, so the next page load asks again.
let asked: Promise<boolean> | null = null;
function askServer(): Promise<boolean> {
  asked ??= adminApi.uploads
    .status()
    .then((s) => s.enabled)
    .catch(() => {
      asked = null;
      return false;
    });
  return asked;
}

// Is photo/video upload switched on at the server (Cloudinary values present)?
// null = still checking; show nothing yet. false = off, so offer the paste-a-link way only.
export function useUploadsEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    askServer().then((v) => alive && setEnabled(v));
    return () => {
      alive = false;
    };
  }, []);
  return enabled;
}
