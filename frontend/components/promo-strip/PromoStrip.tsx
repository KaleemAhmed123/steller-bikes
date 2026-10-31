import './promoStrip.css';
import { findStrip } from './strips';

// The bar above the navbar: the owner's text, wearing the look they picked.
// The shop layout and the admin preview both render this one component.
export function PromoStrip({ styleId, text, countdownEndsAt }: { styleId: string; text: string; countdownEndsAt: string }) {
  const { id, Scene } = findStrip(styleId);
  return (
    <div className={`ps-strip ps-scene-${id}`} role="note">
      <Scene text={text} endsAt={countdownEndsAt} />
    </div>
  );
}
