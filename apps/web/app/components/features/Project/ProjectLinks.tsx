import {
  IconBrandInstagram,
  IconBrandX,
  IconBrandYoutube,
  IconWorld,
  type TablerIcon,
} from '@tabler/icons-react';
import type { ProjectLink, ProjectLinkKind } from 'api';
import { css, cx } from '../../../../styled-system/css';

const LINK_STYLE: Record<
  ProjectLinkKind,
  { icon: TablerIcon; name: string; iconClass: string }
> = {
  website: {
    icon: IconWorld,
    name: 'Webサイト',
    iconClass: css({ color: 'accent.text' }),
  },
  x: { icon: IconBrandX, name: 'X', iconClass: css({ color: '#000000' }) },
  instagram: {
    icon: IconBrandInstagram,
    name: 'Instagram',
    iconClass: css({ color: '#d62976' }),
  },
  youtube: {
    icon: IconBrandYoutube,
    name: 'YouTube',
    iconClass: css({ color: '#ff0000' }),
  },
};

/** 企画の公式サイト・SNS へのリンク列。リンクが無い企画では何も表示しない。 */
export default function ProjectLinks({ links }: { links: ProjectLink[] }) {
  if (links.length === 0) return null;

  return (
    <ul
      aria-label="公式サイト・SNS"
      className={css({ display: 'flex', flexWrap: 'wrap', gap: '8px' })}
    >
      {links.map((link) => {
        const { icon: Icon, name, iconClass } = LINK_STYLE[link.kind];
        return (
          <li key={link.url} className={css({ minWidth: 0 })}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${name}: ${link.label}`}
              className={css({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                maxW: '100%',
                h: '36px',
                pl: '10px',
                pr: '14px',
                borderRadius: '999px',
                border: '1px solid',
                borderColor: 'border',
                bg: 'surface',
                color: 'fg.strong',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'background 0.15s',
                _active: { bg: 'border.subtle' },
              })}
            >
              <Icon
                size={18}
                stroke={1.8}
                className={cx(css({ flexShrink: 0 }), iconClass)}
              />
              <span className={css({ truncate: true })}>{link.label}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
