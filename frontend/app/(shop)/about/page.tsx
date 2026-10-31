import type { Metadata } from 'next';
import { getSettings } from '@/lib/api';
import { SafeImage } from '@/components/SafeImage';
import { ABOUT } from './content';
import './about.css';

export const metadata: Metadata = {
  title: 'About Us - Stellar Bicycle',
  description: 'About Stellar Bicycle at New Midland Cycle Store, Kanpur. Serving customers since 1991.',
};

const Paragraphs = ({ items }: { items: readonly string[] }) => (
  <>
    {items.map((p) => (
      <p key={p}>{p}</p>
    ))}
  </>
);

// A picture beside a block of text. With no picture uploaded, the text simply takes the full width.
function Picture({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="ab-pic">
      <SafeImage src={src} alt={alt} fill sizes="(max-width: 760px) 100vw, 480px" priority={priority} />
    </div>
  );
}

function TextWithPicture({ image, flip, children }: { image: string; flip?: boolean; children: React.ReactNode }) {
  return (
    <section className={`ab-two container${image ? '' : ' ab-two--text'}${flip ? ' ab-two--flip' : ''}`}>
      {image && <Picture src={image} alt="" />}
      <div className="ab-text">{children}</div>
    </section>
  );
}

// The About page. The words come from content.ts exactly as the client wrote them; this file
// only decides how they are laid out. Pictures come from Admin → Platform → Shop info.
export default async function AboutPage() {
  const { aboutImages: img } = await getSettings();
  const { story, matters, brand, guarantee, why, mission, vision, promise, closing, terms } = ABOUT;

  return (
    <article className="ab">
      <header className="ab-hero">
        <h1>{ABOUT.title}</h1>
        {img.hero && (
          <div className="ab-hero-pic container">
            <SafeImage src={img.hero} alt="" fill sizes="(max-width: 1100px) 100vw, 1100px" priority />
          </div>
        )}
      </header>

      <TextWithPicture image={img.story}>
        <h2>{story.heading}</h2>
        <p className="ab-lede">{story.lede}</p>
        <Paragraphs items={story.paragraphs} />
      </TextWithPicture>

      <TextWithPicture image={img.matters} flip>
        <h2>{matters.heading}</h2>
        <Paragraphs items={matters.paragraphs} />
      </TextWithPicture>

      <TextWithPicture image={img.brand}>
        <h2>{brand.heading}</h2>
        <Paragraphs items={brand.paragraphs} />
      </TextWithPicture>

      <section className="ab-dark">
        <div className={`ab-two container${img.guarantee ? '' : ' ab-two--text'}`}>
          <div className="ab-text">
            <h2>{guarantee.heading}</h2>
            <p className="ab-quote">{guarantee.lead}</p>
            <Paragraphs items={guarantee.paragraphs} />
          </div>
          {img.guarantee && <Picture src={img.guarantee} alt="" />}
        </div>
      </section>

      <section className="ab-why container">
        <h2>{why.heading}</h2>
        <ul>
          {why.items.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="ab-values container">
        <div className="ab-card">
          <h2>{mission.heading}</h2>
          <Paragraphs items={mission.paragraphs} />
        </div>
        <div className="ab-card">
          <h2>{vision.heading}</h2>
          <Paragraphs items={vision.paragraphs} />
        </div>
        <div className="ab-card ab-card--promise">
          <h2>{promise.heading}</h2>
          <Paragraphs items={promise.paragraphs} />
        </div>
      </section>

      {img.gallery.length > 0 && (
        <section className="ab-gallery container">
          {img.gallery.map((photo, i) => (
            <div className="ab-gallery-pic" key={`${photo.url}-${i}`}>
              <SafeImage src={photo.url} alt={photo.alt} fill sizes="(max-width: 760px) 50vw, 25vw" />
            </div>
          ))}
        </section>
      )}

      <section className="ab-closing">
        <div className="container">
          <p className="ab-highlights">
            {closing.highlights.map((h) => (
              <strong key={h}>{h}</strong>
            ))}
          </p>
          {closing.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>

      <section className="ab-terms container">
        <h2>{terms.heading}</h2>
        <div>
          {terms.items.map((t) => (
            <div className="ab-term" key={t.title}>
              <h3>{t.title}</h3>
              <p>{t.text}</p>
            </div>
          ))}
        </div>
        <p>{terms.note}</p>
        <p className="ab-signoff">{terms.signoff}</p>
      </section>
    </article>
  );
}
