// The Save button of a Shop info tab, with one status line beside it:
// what went wrong, else "Unsaved changes", else what just happened.
export function SaveRow({ busy, dirty, message, error }: { busy: boolean; dirty: boolean; message: string; error: string }) {
  const status = error || (dirty ? 'Unsaved changes' : message);
  return (
    <div className="si-save">
      <button type="submit" className="btn-primary" disabled={busy || !dirty}>
        {busy ? 'Saving…' : 'Save'}
      </button>
      <p className={`si-status${error ? ' si-status-error' : ''}`} role={error ? 'alert' : 'status'}>
        {status}
      </p>
    </div>
  );
}
