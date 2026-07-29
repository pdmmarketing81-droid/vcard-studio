import type { Video } from '@/lib/types';
import type { ResolvedDesign } from '@/lib/design';
import { ratioCss, EMBED_WIDTH_CLASS } from '@/lib/design';
import { embedUrl, youtubeThumb } from '@/lib/embed';
import Section from './Section';
import EmbedFrame from './EmbedFrame';

type Embed = Video & { src: string };

/**
 * YouTube and Instagram embeds. Both are plain iframes — no third-party SDK —
 * so nothing breaks behind ad blockers and nothing runs before hydration.
 *
 * The two need different shapes: YouTube is a 16:9 video, while Instagram's
 * /embed page is a whole card (header, photo, caption, actions) and gets
 * beheaded by anything shorter than about 9:16. Both are adjustable per card.
 */
export default function Videos({
  videos,
  d,
  titleRule,
  title,
  delay = 0,
}: {
  videos: Video[];
  d: ResolvedDesign;
  titleRule: boolean;
  title: string;
  delay?: number;
}) {
  const embeds = videos
    .map((v) => ({ ...v, src: embedUrl(v.provider, v.url) }))
    .filter((v): v is Embed => !!v.src);

  if (embeds.length === 0) return null;

  const instagram = embeds.filter((v) => v.provider === 'instagram');
  const others = embeds.filter((v) => v.provider !== 'instagram');
  const stacked = d.embedLayout === 'stack';

  const Frame = ({ v, aspect }: { v: Embed; aspect: string }) => (
    <>
      <EmbedFrame
        src={v.src}
        poster={v.provider === 'youtube' ? youtubeThumb(v.url) : null}
        title={v.title ?? 'Embedded media'}
        aspect={aspect}
        instagram={v.provider === 'instagram'}
      />
      {v.title && <p className="mt-2 truncate text-xs opacity-60">{v.title}</p>}
    </>
  );

  const List = ({ list, aspect }: { list: Embed[]; aspect: string }) => {
    if (stacked) {
      return (
        <div className="space-y-3">
          {list.map((v, i) => (
            <div key={v.id} className="reveal-scale" style={{ animationDelay: `${delay + 120 + i * 90}ms` }}>
              <Frame v={v} aspect={aspect} />
            </div>
          ))}
        </div>
      );
    }

    return (
      <>
        <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
          {list.map((v, i) => (
            <div
              key={v.id}
              className={`reveal-scale ${EMBED_WIDTH_CLASS[d.embedWidth]} shrink-0 snap-center`}
              style={{ animationDelay: `${delay + 120 + i * 90}ms` }}
            >
              <Frame v={v} aspect={aspect} />
            </div>
          ))}
        </div>
        {list.length > 1 && (
          <p className="mt-2.5 text-center text-[11px] tracking-wide opacity-45">Swipe for more →</p>
        )}
      </>
    );
  };

  return (
    <>
      {others.length > 0 && (
        <Section d={d} titleRule={titleRule} title={title} delay={delay}>
          <List list={others} aspect={ratioCss(d.videoRatio, '16:9')} />
        </Section>
      )}

      {instagram.length > 0 && (
        <Section d={d} titleRule={titleRule} title="Instagram" delay={delay + 60}>
          <List list={instagram} aspect={ratioCss(d.instagramRatio, '9:16')} />
        </Section>
      )}
    </>
  );
}
