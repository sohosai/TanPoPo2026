# 店舗一覧の検索・絞り込みURL仕様

`/` (店舗一覧) の検索・絞り込み条件は URLクエリパラメータで表現され、状態源は URL のみ(`useSearchParams`)。共有リンク・ブラウザの戻る/進むに対応する。

実装: [`apps/web/app/components/features/Shop/filter.ts`](../../apps/web/app/components/features/Shop/filter.ts)(変換ロジック)、[`apps/web/app/routes/shop/index.tsx`](../../apps/web/app/routes/shop/index.tsx)(URL⇔状態の接続)

## パラメータ一覧

| パラメータ | 形式 | 意味 | マッチ方式 |
| --- | --- | --- | --- |
| `q` | 文字列 | あいまい検索キーワード(企画名・団体名・建物名・タグを対象) | 部分一致 |
| `category` | カンマ区切り(例 `食品,物販`) | 分類(`ShopCategory`) | OR |
| `day` | カンマ区切り(例 `Day1,Day2`) | 開催日(`ScheduleDay`) | OR |
| `tag` | カンマ区切り | タグ(自由文字列。取得済み店舗データから動的に選択肢を生成) | AND |
| `fav` | `1` のみ | いいね済みのみ表示 | — |

- 各パラメータは互いに AND 結合(すべての条件を満たす店舗のみ表示)。
- 値が空の軸はURLから省略される(`criteriaToParams` が空パラメータを付与しない)。
- 未知のカテゴリ/タグ値がURLに含まれていても壊れない(該当チップが表示されないだけで、フィルタとしては適用される)。

## 例

```
/?q=カフェ&category=食品&day=Day1,Day2&tag=屋内&fav=1
```
→ キーワード「カフェ」に部分一致し、分類が「食品」、開催日がDay1またはDay2、タグに「屋内」を含み、いいね済みの店舗のみ表示。

## 新しい絞り込み軸を追加する場合

1. `ShopFilterCriteria`(filter.ts)に フィールドを追加
2. `criteriaFromParams` / `criteriaToParams` にパラメータ変換を追加
3. `filterShops` に条件を追加
4. `ShopSearchBar.tsx` にUI(チップ等)を追加し、`onChange({ ...criteria, ... })` で即時にURLへ反映する
