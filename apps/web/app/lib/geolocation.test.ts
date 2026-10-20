import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectInAppBrowser, permissionSteps } from './geolocation';

describe('geolocation permissionSteps', () => {
  describe('iOS browsers', () => {
    it('returns Safari-specific instructions for native iOS Safari', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
      const steps = permissionSteps(ua);
      assert.ok(steps[0]?.includes('「ぁあ」'));
      assert.ok(steps[1]?.includes('Safari Webサイト'));
    });

    it('returns Brave instructions for iOS Brave', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1 Brave/1.80';
      const steps = permissionSteps(ua);
      assert.equal(
        steps[0],
        '設定 →「Brave」→「位置情報」を「このAppの使用中」に',
      );
      assert.ok(!steps[0]?.includes('Safari'));
    });

    it('returns Chrome instructions for iOS Chrome (CriOS)', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.6261.89 Mobile/15E148 Safari/604.1';
      const steps = permissionSteps(ua);
      assert.equal(
        steps[0],
        '設定 →「Chrome」→「位置情報」を「このAppの使用中」に',
      );
    });

    it('returns Edge instructions for iOS Edge (EdgiOS)', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/122.0.2365.67 Mobile/15E148 Safari/604.1';
      const steps = permissionSteps(ua);
      assert.equal(
        steps[0],
        '設定 →「Edge」→「位置情報」を「このAppの使用中」に',
      );
    });

    it('returns Firefox instructions for iOS Firefox (FxiOS)', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/123.0 Mobile/15E148 Safari/605.1.15';
      const steps = permissionSteps(ua);
      assert.equal(
        steps[0],
        '設定 →「Firefox」→「位置情報」を「このAppの使用中」に',
      );
    });

    it('returns Opera instructions for iOS Opera (OPiOS)', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) OPiOS/18.0.0 Mobile/15E148 Safari/604.1';
      const steps = permissionSteps(ua);
      assert.equal(
        steps[0],
        '設定 →「Opera」→「位置情報」を「このAppの使用中」に',
      );
    });

    it('returns DuckDuckGo instructions for iOS DuckDuckGo', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1 DDB/7.85.0';
      const steps = permissionSteps(ua);
      assert.equal(
        steps[0],
        '設定 →「DuckDuckGo」→「位置情報」を「このAppの使用中」に',
      );
    });

    it('returns Vivaldi instructions for iOS Vivaldi', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1 Vivaldi/6.6';
      const steps = permissionSteps(ua);
      assert.equal(
        steps[0],
        '設定 →「Vivaldi」→「位置情報」を「このAppの使用中」に',
      );
    });

    it('returns Arc instructions for iOS Arc', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1 ArcMobile/1.0';
      const steps = permissionSteps(ua);
      assert.equal(
        steps[0],
        '設定 →「Arc」→「位置情報」を「このAppの使用中」に',
      );
    });

    it('returns generic browser instructions instead of Safari for unknown third-party iOS browser', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 CustomBrowser/2.0';
      const steps = permissionSteps(ua);
      assert.equal(
        steps[0],
        '設定 →「お使いのブラウザ」→「位置情報」を「このAppの使用中」に',
      );
      assert.ok(!steps[0]?.includes('Safari'));
    });
  });

  describe('Desktop browsers', () => {
    it('returns Safari settings for macOS Safari', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
      const steps = permissionSteps(ua);
      assert.equal(
        steps[0],
        '「Safari」→「設定」→「Webサイト」→「位置情報」で「許可」に',
      );
      assert.ok(steps[1]?.includes('システム設定'));
    });

    it('returns address bar instructions for macOS Chrome/Brave/Edge', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
      const steps = permissionSteps(ua);
      assert.equal(
        steps[0],
        'アドレスバー左のアイコン →「位置情報」を「許可」に',
      );
      assert.ok(!steps[0]?.includes('Safari'));
    });

    it('returns Firefox-specific instructions for Desktop Firefox', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0';
      const steps = permissionSteps(ua);
      assert.equal(
        steps[0],
        'アドレスバーの位置情報アイコン →「ブロック」を解除',
      );
      assert.ok(steps[1]?.includes('Windows の設定'));
    });
  });

  describe('Android browsers', () => {
    it('returns Android instructions for Android Chrome', () => {
      const ua =
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.90 Mobile Safari/537.36';
      const steps = permissionSteps(ua);
      assert.equal(
        steps[0],
        'アドレスバー左のアイコン →「権限」→「位置情報」を許可',
      );
      assert.equal(steps[1], '端末の「位置情報」をオン');
    });

    it('returns Android Firefox instructions for Android Firefox', () => {
      const ua =
        'Mozilla/5.0 (Android 14; Mobile; rv:123.0) Gecko/123.0 Firefox/123.0';
      const steps = permissionSteps(ua);
      assert.equal(
        steps[0],
        'アドレスバーの鍵アイコン →「権限」→「位置情報」を許可',
      );
      assert.equal(steps[1], '端末の「位置情報」をオン');
    });
  });
});

describe('detectInAppBrowser', () => {
  it('detects LINE', () => {
    assert.equal(
      detectInAppBrowser('Mozilla/5.0 (iPhone; CPU OS 17_4) Line/14.3.0'),
      'LINE',
    );
  });

  it('detects Instagram', () => {
    assert.equal(
      detectInAppBrowser('Mozilla/5.0 (iPhone; CPU OS 17_4) Instagram 320.0'),
      'Instagram',
    );
  });

  it('detects X (Twitter)', () => {
    assert.equal(
      detectInAppBrowser(
        'Mozilla/5.0 (iPhone; CPU OS 17_4) Twitter for iPhone',
      ),
      'X',
    );
  });

  it('detects SmartNews', () => {
    assert.equal(
      detectInAppBrowser('Mozilla/5.0 (iPhone; CPU OS 17_4) SmartNews/10.0'),
      'SmartNews',
    );
  });

  it('detects Yahoo! JAPAN app', () => {
    assert.equal(
      detectInAppBrowser(
        'Mozilla/5.0 (iPhone; CPU OS 17_4) YJApp-IOS jp.co.yahoo.ipn.appli/4.151.0',
      ),
      'Yahoo! JAPAN',
    );
  });

  it('returns null for standard Safari', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
    assert.equal(detectInAppBrowser(ua), null);
  });
});
