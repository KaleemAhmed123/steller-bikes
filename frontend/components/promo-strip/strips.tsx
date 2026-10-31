import type { ComponentType } from 'react';
import { Bike } from './Bike';
import { Countdown } from './Countdown';
import { Balloons, BellRing, DiyaBasket, Fanous, FlagRack, GiftRack, PartyHat, SantaHat, StarLantern } from './accessories';
import {
  CandyChain, ColourClouds, Chevrons, Contrail, Crescent, Fireworks, Garland, HangingLantern, HOLI_PALETTE,
  LaneLine, Lights, Message, Rider, SaleTag, Stars, Trail,
} from './parts';

// The catalogue of promo strips — the ONE list the shop and the admin both read.
// To add a festival: write its scene below, add a row to STRIPS, and give it a
// `.ps-scene-<id>` block in promoStrip.css. Nothing else changes.

export interface StripDef {
  id: string; // stored in settings as `announcementStyle`; lowercase + hyphens
  name: string;
  description: string;
  sampleText: string; // shown when the owner picks the style and has typed nothing yet
  hasCountdown?: boolean; // true = the admin shows the "countdown ends" field for this look
  Scene: ComponentType<SceneProps>;
}

// What every scene is given. Most use only the text; the countdown look also reads `endsAt`.
export interface SceneProps {
  text: string;
  endsAt: string; // ISO timestamp
}

type Scene = ComponentType<SceneProps>;

const Diwali: Scene = ({ text }) => (
  <>
    <Lights />
    <Garland />
    <Rider seconds={17} offsetS={5} bottom={8}>
      <Trail kind="spark" />
      <Bike scarf="#ffb347" behind={<StarLantern />} front={<DiyaBasket />} />
    </Rider>
    <Message text={text} />
  </>
);

const DiwaliNight: Scene = ({ text }) => (
  <>
    <Stars count={10} />
    <Fireworks colors={['#ffcf6b', '#ff7a3a', '#ff4d6d', '#fff3c4', '#ffb347']} />
    <Rider seconds={14} offsetS={2}>
      <Trail kind="spark" />
      <Bike neon scarf="#ffb347" behind={<StarLantern />} front={<DiyaBasket />} />
    </Rider>
    <Message text={text} />
  </>
);

const Christmas: Scene = ({ text }) => (
  <>
    <CandyChain />
    <Rider seconds={16} offsetS={6} bottom={8}>
      <Trail kind="snow" colors={['#fff']} />
      <Bike scarf="#e53945" behind={<GiftRack />} head={<SantaHat />} />
    </Rider>
    <Message text={text} />
  </>
);

const NewYear: Scene = ({ text, endsAt }) => (
  <>
    <Fireworks colors={['#ffd36b', '#9fd0ff', '#ff6fa8', '#fff', '#b58cff']} />
    <Rider seconds={18} offsetS={4}>
      <Trail kind="confetti" colors={['#ffd36b', '#fff', '#ff6fa8', '#6fd6ff', '#b58cff']} />
      <Bike scarf="#ffd36b" behind={<Balloons />} head={<PartyHat />} />
    </Rider>
    <Message text={text} />
    <Countdown endsAt={endsAt} />
  </>
);

const Holi: Scene = ({ text }) => (
  <>
    <ColourClouds />
    <Rider seconds={15} offsetS={5}>
      <Trail kind="puff" colors={HOLI_PALETTE} />
      <Bike scarf="#ff2d95" />
    </Rider>
    <Message text={text} />
  </>
);

const Eid: Scene = ({ text }) => (
  <>
    <Stars count={14} />
    <Crescent />
    <HangingLantern side="left" left="5%" />
    <HangingLantern side="right" left="92%" />
    <Rider seconds={17} offsetS={8}>
      <Trail kind="star" />
      <Bike scarf="#f3d58a" behind={<Fanous />} />
    </Rider>
    <Message text={text} />
  </>
);

const Tiranga: Scene = ({ text }) => (
  <>
    <Rider seconds={15} offsetS={6}>
      <Contrail />
      <Bike scarf="#ff9933" chakra behind={<FlagRack />} />
    </Rider>
    <Message text={text} />
  </>
);

const WheelieSale: Scene = ({ text }) => (
  <>
    <Chevrons />
    <SaleTag side="left" />
    <Rider seconds={13} offsetS={3} bottom={5}>
      <Bike scarf="#16191b" wheelie />
    </Rider>
    <Message text={text} />
    <SaleTag side="right" />
  </>
);

const Everyday: Scene = ({ text }) => (
  <>
    <LaneLine />
    <Rider seconds={15} offsetS={5} bottom={6}>
      <Bike scarf="#d4ab57" front={<BellRing />} />
    </Rider>
    <Message text={text} />
  </>
);

// Keep DEFAULT_STRIP_ID in step with DEFAULT_STRIP_STYLE in backend/src/lib/promoStrip.ts.
export const DEFAULT_STRIP_ID = 'everyday';

export const STRIPS: readonly StripDef[] = [
  { id: 'diwali', name: 'Diwali Ride', description: 'String lights on top, a marigold garland below. A rider tows a star lantern, carries glowing diyas and sheds sparks.', sampleText: 'Diwali Dhamaka · up to 25% off on every cycle', Scene: Diwali },
  { id: 'diwali-night', name: 'Diwali Night', description: 'Fireworks burst over a dark sky while a neon-outlined rider cruises by with diyas and a lantern.', sampleText: 'Light up your Diwali ride · free delivery in Kanpur', Scene: DiwaliNight },
  { id: 'christmas', name: 'Christmas Ride', description: 'A candy-cane chain and falling snow. The rider wears a Santa hat and carries gifts on the rack.', sampleText: 'Merry Christmas · gift a cycle, free helmet on kids bikes', Scene: Christmas },
  { id: 'new-year', name: 'New Year Countdown', description: 'Fireworks and a flip-clock counting down to the date you set (the next 1 January until you change it), with a party-hat rider trailing balloons and confetti.', sampleText: 'New Year sale starts in', hasCountdown: true, Scene: NewYear },
  { id: 'holi', name: 'Holi Splash', description: 'Soft colour clouds drift behind the text and the bike leaves puffs of gulal in every colour.', sampleText: 'Holi Hai! Ride into the colours · free helmet with every cycle', Scene: Holi },
  { id: 'eid', name: 'Eid Lantern Ride', description: 'A teal night with twinkling stars, a crescent and swinging lanterns. The rider tows a lantern and leaves stars behind.', sampleText: 'Eid Mubarak · festive prices on every cycle this week', Scene: Eid },
  { id: 'tiranga', name: 'Tiranga Ride', description: 'For Republic Day and Independence Day: an Ashoka-chakra front wheel, a flag on the rack and a tricolour contrail.', sampleText: 'Happy Independence Day · ride free, save 15% on all cycles', Scene: Tiranga },
  { id: 'wheelie-sale', name: 'Wheelie Sale', description: 'A gold race-jersey strip with speed chevrons. The rider pops a wheelie every few seconds. For any big sale.', sampleText: 'Mega sale · up to 40% off', Scene: WheelieSale },
  { id: 'everyday', name: 'Everyday Ride', description: 'The no-festival default: a rider on a dashed lane line who rings the bell every few seconds.', sampleText: 'Free delivery in Kanpur on every cycle', Scene: Everyday },
];

// An unknown key (an old style that was removed, or '' before the API answers) wears the default.
export function findStrip(id: string): StripDef {
  return STRIPS.find((s) => s.id === id) ?? STRIPS.find((s) => s.id === DEFAULT_STRIP_ID) ?? STRIPS[0];
}
