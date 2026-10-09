import {
  IconCurrentLocation,
  IconCurrentLocationFilled,
  IconHome,
  IconLoader2,
} from '@tabler/icons-react';
import maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { SHEET_PEEK } from '~/components/layouts/MapPanel/BottomSheet';
import {
  hasSeenGeolocationIntro,
  markGeolocationIntroSeen,
  useGeolocationPermission,
} from '~/lib/geolocation';
import { useIsDesktop } from '~/lib/viewport';
import { css, cx } from '../../../../styled-system/css';
import LocationPermissionDialog, {
  type LocationDialogKind,
} from './LocationPermissionDialog';
import { useMap } from './MapController';

type LocateState = 'off' | 'waiting' | 'active' | 'background';

const MESSAGE_DURATION_MS = 4000;

const ERROR_MESSAGES: Record<number, string> = {
  2: '現在地を取得できませんでした。位置情報がオンか確認してください。',
  3: '現在地を取得できませんでした。もう一度お試しください。',
};

const roundButton = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  w: '44px',
  h: '44px',
  borderRadius: '999px',
  bg: 'overlay.control',
  color: 'fg.muted',
  boxShadow: 'float',
  cursor: 'pointer',
  transition: 'transform 0.1s, color 0.15s',
  _active: { transform: 'scale(0.92)' },
});

const PITCH_3D = 60;

/**
 * 地図右下の操作ボタン（初期表示へ戻る、現在地の表示・追従、3D/2D の切り替え）。
 * 現在地の点・精度の円・追従は MapLibre の GeolocateControl に任せ、標準のボタンは隠して
 * このボタンから操作する。
 */
export default function MapControls() {
  const { isReady, getMap, resetView } = useMap();
  const isDesktop = useIsDesktop();
  const geolocateRef = useRef<maplibregl.GeolocateControl | null>(null);
  const stateRef = useRef<LocateState>('off');
  const [state, setStateValue] = useState<LocateState>('off');
  const [message, setMessage] = useState<string | null>(null);
  const [is3d, setIs3d] = useState(false);
  const [dialog, setDialog] = useState<LocationDialogKind | null>(null);
  const permission = useGeolocationPermission();

  const setState = (next: LocateState) => {
    stateRef.current = next;
    setStateValue(next);
  };

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), MESSAGE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [message]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setState は ref と state を同時に更新するだけ
  useEffect(() => {
    const map = getMap();
    if (!isReady || !map) return;

    const geolocate = new maplibregl.GeolocateControl({
      // timeout を省くと既定値ではなく無期限になり、屋内で取得できないとき待ち続けてしまう。
      positionOptions: {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
      trackUserLocation: true,
      showAccuracyCircle: true,
      fitBoundsOptions: { maxZoom: 17.5 },
    });
    geolocate.on('geolocate', () => {
      if (stateRef.current === 'waiting') setState('active');
    });
    geolocate.on('trackuserlocationstart', () => setState('active'));
    // 自分で追従を止めたとき（off にした直後）にも発火するため、その場合は無視する。
    geolocate.on('trackuserlocationend', () => {
      if (stateRef.current !== 'off') setState('background');
    });
    // 拒否以外のエラーや会場外では、GeolocateControl はエラー状態のまま位置の監視を続ける。
    // 次の trigger() で off に戻るので、ここで呼んで監視ごと止める。
    const stop = () => {
      setState('off');
      geolocate.trigger();
    };
    geolocate.on('error', (e: GeolocationPositionError) => {
      if (e.code === e.PERMISSION_DENIED) {
        setState('off');
        setDialog('denied');
        return;
      }
      // 追従中の一時的な失敗は、現在地の点を薄く表示したまま次の取得で元に戻る。
      if (stateRef.current !== 'waiting') return;
      stop();
      setMessage(ERROR_MESSAGES[e.code] ?? ERROR_MESSAGES[2]);
    });
    geolocate.on('outofmaxbounds', () => {
      if (stateRef.current === 'off') return;
      stop();
      setMessage('会場の外にいるため表示できません。');
    });
    map.addControl(geolocate);
    geolocateRef.current = geolocate;

    return () => {
      // 地図ごと画面を離れるときは View の後片付けで map.remove() が先に走り、
      // コントロールも外し済みになる。そこで再度外すと MapLibre 内部で例外になる。
      if (map.hasControl(geolocate)) map.removeControl(geolocate);
      geolocateRef.current = null;
      setState('off');
    };
  }, [isReady, getMap]);

  // 右ドラッグや2本指での傾け、初期表示へ戻る操作でも表示を追従させる。
  useEffect(() => {
    const map = getMap();
    if (!isReady || !map) return;
    const sync = () => setIs3d(map.getPitch() > 0);
    sync();
    map.on('pitchend', sync);
    return () => {
      map.off('pitchend', sync);
    };
  }, [isReady, getMap]);

  const toggle3d = () => {
    const map = getMap();
    if (!map) return;
    map.easeTo(
      is3d
        ? { pitch: 0, bearing: 0, duration: 500 }
        : { pitch: PITCH_3D, duration: 500 },
    );
  };

  const goHome = () => {
    // 追従中のままだと次の位置更新で現在地へ引き戻される。GeolocateControl はズームを伴う移動では
    // 追従を外さないため、先にズームなしで動かして追従だけ外す（現在地の点は残る）。
    if (stateRef.current === 'active') {
      getMap()?.panBy([1, 0], { duration: 0 });
    }
    resetView();
  };

  // ブラウザの許可の確認はユーザー操作の中でないと出ない（または目立たない表示になる）ため、
  // クリックのハンドラから同期的に呼ぶ。
  const startLocate = () => {
    const geolocate = geolocateRef.current;
    if (!geolocate || stateRef.current !== 'off') return;
    setState('waiting');
    geolocate.trigger();
  };

  // 設定から許可して戻ってきたら、そのまま現在地を表示する。サイトは許可済みでも OS 側で
  // 拒否されていると拒否のエラーになるため、許可に変わった時点だけを見ないと取得を繰り返してしまう。
  const prevPermissionRef = useRef(permission);
  // biome-ignore lint/correctness/useExhaustiveDependencies: 許可状態が変わったときだけ動かす
  useEffect(() => {
    const prev = prevPermissionRef.current;
    prevPermissionRef.current = permission;
    if (prev !== 'granted' && permission === 'granted' && dialog === 'denied') {
      setDialog(null);
      startLocate();
    }
  }, [permission]);

  /** 許可の状態に応じて、説明や設定手順を挟んでから取得を始める。 */
  const requestLocate = () => {
    if (!('geolocation' in navigator) || !window.isSecureContext) {
      setMessage('この端末では位置情報を使えません。');
    } else if (permission === 'denied') {
      setDialog('denied');
    } else if (permission !== 'granted' && !hasSeenGeolocationIntro()) {
      setDialog('intro');
    } else {
      startLocate();
    }
  };

  const toggleLocate = () => {
    const geolocate = geolocateRef.current;
    if (!geolocate) return;
    if (stateRef.current === 'off') {
      requestLocate();
      return;
    }
    // GeolocateControl は trigger() のたびに off → 取得・追従 → off と巡回し、
    // 追従が外れた状態（background）からは追従に戻る。
    if (stateRef.current !== 'background') setState('off');
    geolocate.trigger();
  };

  const allowLocate = () => {
    if (dialog === 'intro') markGeolocationIntroSeen();
    setDialog(null);
    startLocate();
  };

  const LocateIcon =
    state === 'waiting'
      ? IconLoader2
      : state === 'active'
        ? IconCurrentLocationFilled
        : IconCurrentLocation;

  return (
    <div
      className={css({
        position: 'fixed',
        right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
        // シートより下に置き、シートを開いたときはその下に隠れるようにする。
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '10px',
      })}
      style={{
        // PC ではシートが下に無いため、地図右下の著作権表記のすぐ上に寄せる。
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${isDesktop ? 40 : SHEET_PEEK + 16}px)`,
      }}
    >
      <LocationPermissionDialog
        kind={dialog}
        canRetry={permission !== 'denied'}
        onAllow={allowLocate}
        onClose={() => setDialog(null)}
      />
      {message && (
        <p
          role="status"
          className={css({
            maxW: 'min(280px, calc(100vw - 32px))',
            px: '12px',
            py: '8px',
            borderRadius: '12px',
            bg: 'overlay.tooltip',
            color: 'surface',
            fontSize: '12px',
            lineHeight: 1.6,
            boxShadow: 'float',
            animation: 'detailEnter 0.2s ease-out',
          })}
        >
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={goHome}
        aria-label="会場全体を表示"
        className={roundButton}
      >
        <IconHome size={22} />
      </button>
      <button
        type="button"
        onClick={toggleLocate}
        aria-label={
          state === 'active' ? '現在地の追従をやめる' : '現在地を表示'
        }
        aria-pressed={state === 'active'}
        className={cx(
          roundButton,
          css({ '&[aria-pressed=true]': { color: 'accent.text' } }),
          state === 'background' && css({ color: 'accent.text' }),
        )}
      >
        <LocateIcon
          size={22}
          className={
            state === 'waiting'
              ? css({ animation: 'spin 1s linear infinite' })
              : undefined
          }
        />
      </button>
      <button
        type="button"
        onClick={toggle3d}
        aria-label={is3d ? '2D表示に切り替える' : '3D表示に切り替える'}
        className={cx(
          roundButton,
          css({ fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }),
        )}
      >
        {is3d ? '2D' : '3D'}
      </button>
    </div>
  );
}
