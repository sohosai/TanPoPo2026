# 企画一覧の検索・絞り込みURL仕様

`/` (企画一覧) の検索・絞り込み条件は URLクエリパラメータで表現され、状態源は URL のみ(`useSearchParams`)。共有リンク・ブラウザの戻る/進むに対応する。

実装: [`apps/web/app/components/features/Project/criteria.ts`](../../apps/web/app/components/features/Project/criteria.ts)(条件の型とURL変換)、[`filter.ts`](../../apps/web/app/components/features/Project/filter.ts)(絞り込み)、[`apps/web/app/routes/project/index.tsx`](../../apps/web/app/routes/project/index.tsx)(URL⇔状態の接続)

## パラメータ一覧

| パラメータ | 形式 | 意味 | マッチ方式 |
| --- | --- | --- | --- |
| `q` | 文字列 | あいまい検索キーワード(企画名・団体名とそのよみがな・場所・説明文を対象) | 部分一致 |
| `category` | カンマ区切り(例 `食事,物品販売`) | 分類(`ProjectCategory`) | OR |
| `day` | カンマ区切り(例 `Day1,Day2`) | 開催日(`ScheduleDay`) | OR |
| `fav` | `1` のみ | いいね済みのみ表示 | — |

- 各パラメータは互いに AND 結合(すべての条件を満たす企画のみ表示)。
- 値が空の軸はURLから省略される(`criteriaToParams` が空パラメータを付与しない)。
- 未知のカテゴリ値がURLに含まれていても壊れない(選択肢にない値は捨てる)。

## キーワード検索

- 全角/半角、大文字/小文字、カタカナ/ひらがなを区別しない(「からあげ」「カラアゲ」「ｶﾗｱｹﾞ」は同じ)。
- 企画名・団体名はよみがな(`nameReading`・`organizationReading`、SOS の `namePhonetic`・`organizationNamePhonetic`)でも引ける(「やきとり」で「焼き鳥」)。よみがなは語の間に空白が入るため、空白を除いたものでも引けるようにしている(「こぴかつそうほうさい」)。説明文はよみがなでは引けない。
- 場所は場所名・よみがなと、`1B208` のような表示ラベルで引ける。
- 並びは、企画名・団体名・場所に一致した企画が先、説明文だけに一致した企画が後で、それぞれ企画番号順。キーワードが空なら企画番号順。
- 検索用の文字列(正規化した企画名・団体名・場所・説明文)は企画と場所を取得したときに一度だけ作り(`buildSearchIndex`)、入力のたびには部分一致を調べるだけにする。
- 企画一覧は全件の行を出したまま、一致しない行を隠す。一致した順に並べ替えるときも行は key で使い回し、作り直さない。

## 例

```
/?q=カフェ&category=食事&day=Day1,Day2&fav=1
```
→ キーワード「カフェ」に部分一致し、分類が「食事」、開催日がDay1またはDay2、いいね済みの企画のみ表示。

## 新しい絞り込み軸を追加する場合

1. `ProjectFilterCriteria`(criteria.ts)に フィールドを追加
2. `criteriaFromParams` / `criteriaToParams` にパラメータ変換を追加(選択肢が決まっている軸は、不正な値を捨てる)
3. `filterProjects`(filter.ts)に条件を追加
4. `FilterSheet.tsx` に選択肢を追加し、`onChange({ ...criteria, ... })` で即時にURLへ反映する。1タップで選ばせたい軸は、`ProjectSearchBar.tsx` のチップの行にも置く

## 画面ごとの使い方

条件(`ProjectFilterCriteria`)は、どの画面でも同じ部品で扱う。

- `ProjectSearchBar` … 検索欄、いいね・日程のチップ、件数の行（`FilterSummary`）、全条件を選ぶ絞り込みシート。条件と `onChange` と件数、件数の行を出すかを渡す。件数の行には件数、選んだカテゴリの名前、「条件をクリア」を1行に並べ、カテゴリの名前を押すと絞り込みシートを開く。
- `useFilteredProjects(範囲の企画, 条件)` … お気に入りと場所を取得して絞り込み、上の並びで返す。
- `ProjectList` … 企画の行を並べる。

検索バーを出すのは企画一覧とグランプリの一般部門だけで、場所・エリアの企画一覧には出さない。条件の置き場は画面で異なり、企画一覧は共有・戻る操作のため URL クエリ、グランプリは画面内の `useState` に持つ。
