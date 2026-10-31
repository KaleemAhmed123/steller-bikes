import './saveRow.css';

// The submit button of a settings form with one status line beside it:
// what went wrong, else "Unsaved changes", else what just happened.
export function SaveRow({
  busy,
  dirty,
  message,
  error,
  label = 'Save',
  busyLabel = 'Saving…',
}: {
  busy: boolean;
  dirty: boolean;
  message: string;
  error: string;
  label?: string;
  busyLabel?: string;
}) {
  const status = error || (dirty ? 'Unsaved changes' : message);
  return (
    <div className="save-row">
      <button type="submit" className="btn-primary" disabled={busy || !dirty}>
        {busy ? busyLabel : label}
      </button>
      <p className={`save-status${error ? ' save-status-error' : ''}`} role={error ? 'alert' : 'status'}>
        {status}
      </p>
    </div>
  );
}
