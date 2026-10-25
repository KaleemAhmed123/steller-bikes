/* eslint-disable @next/next/no-img-element */
// Shown in place of a gallery when a variant has no photos or videos. Deliberately
// does NOT borrow another picture — the customer must never see a different
// product's photo under the wrong option.
export function NoMedia() {
  return (
    <div className="rc-nomedia" role="img" aria-label="No image available">
      <img src="/logos/LOGO.png" alt="" aria-hidden="true" className="rc-nomedia-logo" />
      <span className="rc-nomedia-text">No Image Available</span>
    </div>
  );
}
