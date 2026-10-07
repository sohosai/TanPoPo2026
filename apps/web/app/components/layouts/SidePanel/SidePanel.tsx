import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useMap } from '~/components/features/Map/MapController';
import {
  BottomSheetContext,
  type SheetApi,
} from '~/components/layouts/BottomSheet/BottomSheet';
import { css } from '../../../../styled-system/css';

const PANEL_WIDTH = 408;
// panelStyles の transition と揃える。
const SLIDE_MS = 300;

const panelStyles = css({
  position: 'fixed',
  top: 0,
  bottom: 0,
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column',
  // 中身は h: 100% で自前のスクロール領域を持つことがあるため、上の余白はスクロール領域の外で取る。
  pt: '12px',
  bg: 'sheet.background',
  boxShadow: '0 0 20px {colors.sheet.shadow}',
  // transform を使うと、中の position: fixed な要素の基準がパネルになってしまうため left で動かす。
  transition: 'left 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
});

const contentStyles = css({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
});

const toggleStyles = css({
  position: 'absolute',
  top: '50%',
  left: '100%',
  transform: 'translateY(-50%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  w: '24px',
  h: '48px',
  borderRadius: '0 8px 8px 0',
  bg: 'sheet.background',
  color: 'fg.muted',
  boxShadow: '4px 0 8px {colors.sheet.shadow}',
  cursor: 'pointer',
  _hover: { color: 'accent.text' },
});

/**
 * PC 向けの左サイドパネル。地図は画面全体に敷いたまま、パネルで隠れる分だけ
 * 地図の padding を空け、フォーカスや初期表示が見えている範囲の中央に来るようにする。
 */
export default function SidePanel({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(true);
  const { isReady, getMap } = useMap();

  useEffect(() => {
    const map = getMap();
    if (!isReady || !map) return;
    map.easeTo({
      padding: { left: open ? PANEL_WIDTH : 0 },
      duration: SLIDE_MS,
    });
  }, [open, isReady, getMap]);

  // スマホ幅へ切り替わったときに、パネル分の余白を地図に残さない。
  useEffect(
    () => () => {
      getMap()?.setPadding({ left: 0 });
    },
    [getMap],
  );

  const panelApi = useMemo<SheetApi>(
    () => ({
      expand: () => setOpen(true),
      raise: () => setOpen(true),
      // 地図はパネルの横に常に見えているため、畳む必要はない。
      collapse: () => {},
    }),
    [],
  );

  return (
    <aside
      className={panelStyles}
      style={{ width: PANEL_WIDTH, left: open ? 0 : -PANEL_WIDTH }}
    >
      <BottomSheetContext.Provider value={panelApi}>
        <div className={contentStyles} inert={!open}>
          {children}
        </div>
      </BottomSheetContext.Provider>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'サイドパネルを閉じる' : 'サイドパネルを開く'}
        aria-expanded={open}
        className={toggleStyles}
      >
        {open ? <IconChevronLeft size={18} /> : <IconChevronRight size={18} />}
      </button>
    </aside>
  );
}
