import { useState } from 'react';

// The one upload flow behind every admin image field: pick a file, show "busy", report a plain
// message if it fails, hand the new link back. Each field supplies its own `run` (its own rules).
export interface UploadResult {
  url: string;
  warning?: string; // not an error: the upload worked but the owner should know something
}

export function useFileUpload(run: (file: File) => Promise<UploadResult>, onUrl: (url: string) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // so choosing the same file again still fires
    if (!file) return;
    setBusy(true);
    setError('');
    setWarning('');
    try {
      const result = await run(file);
      onUrl(result.url);
      setWarning(result.warning ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, warning, clearWarning: () => setWarning(''), onFile };
}
