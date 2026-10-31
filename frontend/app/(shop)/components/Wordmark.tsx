/* eslint-disable @next/next/no-img-element */
// The brand logo: ONE picture holding the mark, STELLAR and the tagline, exactly as the client supplied it
// (white background removed, empty margin cropped). Height is set in CSS (.rc-logo); the width follows.
// To change the logo, replace public/logos/stellar-logo.png keeping the same proportions (about 5.5 : 1).
export function Wordmark() {
  return (
    <img
      className="rc-logo"
      src="/logos/stellar-logo.png"
      width={900}
      height={164}
      alt="Stellar Bikes — New Midland Cycle Store, Est. 1991"
    />
  );
}
