import { IconChevronRight, IconX } from '@tabler/icons-react';
import type { Project, ScheduleDay } from 'api';
import maplibregl from 'maplibre-gl';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  compareSchedule,
  formatSchedule,
} from '~/components/features/Project/labels';
import ProjectIcon from '~/components/features/Project/ProjectIcon';
import { css } from '../../../../styled-system/css';
import type { LngLat } from './geo';
import { useMap } from './MapController';

/** 日替わりなどで複数の企画が入るテントと、そこで実施する企画。 */
export type BoothChoice = {
  point: LngLat;
  entries: { project: Project; days: ScheduleDay[] }[];
};

/**
 * 複数の企画が入るテントをタップしたときに、テントの真上に出す企画の選択肢。
 * どの企画がいつ実施するかを並べ、選んだ企画の詳細を開く。
 */
export default function BoothChooser({
  choice: { point, entries },
  onSelect,
  onClose,
}: {
  choice: BoothChoice;
  onSelect: (project: Project) => void;
  onClose: () => void;
}) {
  const { isReady, getMap } = useMap();
  const [element] = useState(() => {
    const el = document.createElement('div');
    // ほかの吹き出しより手前に出す。地図のタップの側（CampusLayers）は、この上のタップを無視する。
    el.dataset.mapCallout = '';
    el.style.zIndex = '2';
    for (const type of ['mousedown', 'touchstart', 'dblclick']) {
      el.addEventListener(type, (e) => e.stopPropagation());
    }
    return el;
  });
  const [lng, lat] = point;

  useEffect(() => {
    const map = getMap();
    if (!isReady || !map) return;
    const marker = new maplibregl.Marker({
      element,
      anchor: 'bottom',
      offset: [0, -8],
    })
      .setLngLat([lng, lat])
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [isReady, getMap, element, lng, lat]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-label="このテントの企画を選ぶ"
      className={css({
        position: 'relative',
        w: '232px',
        p: '6px',
        borderRadius: '12px',
        bg: 'surface',
        color: 'fg',
        boxShadow: 'float',
        animation: 'fadeIn 0.15s ease-out',
        _motionReduce: { animation: 'none' },
        // 下向きのしっぽ。
        _after: {
          content: '""',
          position: 'absolute',
          top: '100%',
          left: '50%',
          ml: '-7px',
          borderWidth: '7px 7px 0',
          borderStyle: 'solid',
          borderColor: 'token(colors.surface) transparent transparent',
        },
      })}
    >
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '4px',
          pl: '6px',
        })}
      >
        <p
          className={css({
            fontSize: '2xs',
            fontWeight: 700,
            color: 'accent.text',
          })}
        >
          このテントの企画（{entries.length}件）
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className={css({
            display: 'grid',
            placeItems: 'center',
            w: '24px',
            h: '24px',
            borderRadius: 'full',
            color: 'fg.subtle',
            cursor: 'pointer',
            _hover: { bg: 'border.subtle' },
          })}
        >
          <IconX size={14} />
        </button>
      </div>
      <ul
        className={css({
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          mt: '2px',
        })}
      >
        {entries
          .toSorted((a, b) => compareSchedule(a.days, b.days))
          .map(({ project, days }) => (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => onSelect(project)}
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  w: '100%',
                  p: '6px',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  _hover: { bg: 'border.subtle' },
                  _active: { bg: 'border.subtle' },
                })}
              >
                <ProjectIcon project={project} size={32} />
                <span className={css({ flex: 1, minW: 0 })}>
                  {/* 日替わりのテントでは、いつの企画かが選ぶ決め手になるため企画名より先に出す。 */}
                  <span
                    className={css({
                      display: 'block',
                      fontSize: '2xs',
                      fontWeight: 700,
                      color: 'fg.muted',
                    })}
                  >
                    {formatSchedule(days)}
                  </span>
                  <span
                    className={css({
                      display: 'block',
                      fontSize: 'sm',
                      fontWeight: 700,
                      color: 'fg.strong',
                      lineHeight: 1.3,
                      lineClamp: 2,
                    })}
                  >
                    {project.name}
                  </span>
                </span>
                <IconChevronRight
                  size={16}
                  className={css({ flexShrink: 0, color: 'fg.subtle' })}
                />
              </button>
            </li>
          ))}
      </ul>
    </div>,
    element,
  );
}
