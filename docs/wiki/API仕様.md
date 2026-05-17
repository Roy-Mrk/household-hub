# API 仕様

## 共通仕様

- **認証:** 全エンドポイントで Supabase セッション（Cookie）が必要。未認証の場合は `401 Unauthorized`。
- **バリデーションエラー:** `400 Bad Request` で以下の形式を返す。
  ```json
  { "error": "validation_error", "issues": [{ "path": "amount", "message": "必須項目です" }] }
  ```
- **金額:** 全て円単位の整数（`bigint`）。小数なし。
- **日付:** `YYYY-MM-DD` 形式。

---

## 収入 `/api/income`

### GET /api/income — 収入一覧取得

**クエリパラメータ:**

| パラメータ | 型 | 説明 |
|---|---|---|
| `q` | string | 説明（source）の部分一致検索 |
| `from` | string | 開始日（YYYY-MM-DD） |
| `to` | string | 終了日（YYYY-MM-DD） |
| `limit` | number | 取得件数（デフォルト 50） |
| `offset` | number | オフセット（デフォルト 0） |

**レスポンス `200`:**
```json
{
  "data": [
    {
      "id": 1,
      "source": "給与",
      "amount": 250000,
      "entry_date": "2025-01-25",
      "owner": "self",
      "needs_settlement": false,
      "subcategory_id": "uuid",
      "created_at": "2025-01-25T10:00:00Z"
    }
  ],
  "count": 100,
  "limit": 50,
  "offset": 0
}
```

### POST /api/income — 収入登録

**リクエストボディ:**
```json
{
  "source": "給与",
  "amount": 250000,
  "entry_date": "2025-01-25",
  "owner": "self",
  "needs_settlement": false,
  "subcategory_id": "uuid（省略可）"
}
```

**バリデーション:**
- `source`: 1〜100 文字、必須
- `amount`: 0 以上の整数、最大 1,000,000,000
- `entry_date`: YYYY-MM-DD 形式の有効な日付、必須
- `owner`: `"self"` または `"shared"`

**レスポンス `201`:** 作成されたエントリ

### PATCH /api/income — 収入更新

**リクエストボディ:**
```json
{
  "id": 1,
  "source": "副収入",
  "amount": 50000
}
```

- `id` は必須。その他のフィールドは更新したいものだけ含める（最低 1 フィールド必要）。

**レスポンス `200`:** 更新後のエントリ

### DELETE /api/income?id=1 — 収入削除

**クエリパラメータ:** `id`（必須）

**レスポンス `200`:** `{ "success": true }`

---

## 支出 `/api/expense`

収入（`/api/income`）と同一のインターフェース。エンドポイントを `/api/expense` に読み替えてください。

---

## カテゴリ `/api/categories`

### GET /api/categories?type=expense — カテゴリ一覧取得

**クエリパラメータ:** `type`（`"income"` または `"expense"`、必須）

**レスポンス `200`:**
```json
[
  {
    "id": "uuid",
    "name": "食費",
    "type": "expense",
    "user_id": null,
    "sort_order": 1,
    "subcategories": [
      { "id": "uuid", "name": "外食", "sort_order": 1 },
      { "id": "uuid", "name": "食材", "sort_order": 2 }
    ]
  }
]
```

- `user_id: null` はマスターデータ（全ユーザー共通）
- マスターデータが先頭、ユーザー独自カテゴリが後尾

### POST /api/categories — カスタムカテゴリ作成

**リクエストボディ:**
```json
{ "name": "趣味", "type": "expense" }
```

**バリデーション:** `name` 1〜30 文字、`type` は `"income"` または `"expense"`

**レスポンス `201`:** 作成されたカテゴリ

---

## サブカテゴリ `/api/subcategories`

### POST /api/subcategories — カスタムサブカテゴリ作成

**リクエストボディ:**
```json
{ "category_id": "uuid", "name": "ゲーム" }
```

**バリデーション:** `category_id` は UUID、`name` は 1〜30 文字

**レスポンス `201`:** 作成されたサブカテゴリ

---

## 世帯 `/api/households`

### GET /api/households — 世帯情報取得

**レスポンス `200`（世帯あり）:**
```json
{
  "household": {
    "id": "uuid",
    "name": "田中家",
    "role": "owner",
    "created_at": "2025-01-01T00:00:00Z",
    "members": [
      { "user_id": "uuid", "display_name": "田中太郎", "role": "owner", "joined_at": "..." }
    ]
  }
}
```

**レスポンス `200`（世帯なし）:** `{ "household": null }`

### POST /api/households — 世帯作成

**リクエストボディ:**
```json
{ "name": "田中家" }
```

作成者は自動的に `owner` ロールで追加される。

**レスポンス `201`:** 作成された世帯

### DELETE /api/households — 世帯解散（オーナーのみ）

全メンバーを削除し、世帯を削除する。

**レスポンス `200`:** `{ "success": true }`

---

## 招待 `/api/households/invite`

### POST /api/households/invite — 招待リンク生成

**リクエストボディ:**
```json
{ "expires_in_hours": 72 }
```

- `expires_in_hours`: 1〜720 時間（省略時 72 時間）

**レスポンス `201`:**
```json
{ "token": "uuid" }
```

招待 URL は `https://your-domain/invite/{token}` の形式で使用。

### GET /api/households/invite?token=uuid — 招待情報取得

**レスポンス `200`:**
```json
{
  "invitation": {
    "household_name": "田中家",
    "expires_at": "2025-01-04T00:00:00Z",
    "is_valid": true,
    "is_expired": false,
    "is_used": false
  }
}
```

---

## 世帯参加・退出

### POST /api/households/join — 招待で世帯に参加

**リクエストボディ:**
```json
{ "token": "uuid" }
```

トークンの有効期限・使用済みを検証した後、`household_members` に追加。

**レスポンス `200`:** `{ "success": true }`

### POST /api/households/leave — 世帯退出（メンバーのみ）

リクエストボディ不要。オーナーは退出不可（先に他メンバーを追加するか世帯解散が必要）。

**レスポンス `200`:** `{ "success": true }`

---

## 精算 `/api/settlement`

### GET /api/settlement — 精算履歴一覧

**クエリパラメータ:** `limit`（デフォルト 20）、`offset`（デフォルト 0）

**レスポンス `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "settled_at": "2025-01-31T00:00:00Z",
      "total_amount": 50000,
      "split_ratios": [...],
      "payments": [...],
      "cancelled_at": null
    }
  ],
  "count": 5,
  "limit": 20,
  "offset": 0
}
```

### POST /api/settlement — 精算実行

**リクエストボディ:**
```json
{
  "split_ratios": [
    { "user_id": "uuid", "ratio": 60 },
    { "user_id": "uuid", "ratio": 40 }
  ],
  "items": [
    { "item_type": "expense", "item_id": 101 },
    { "item_type": "income",  "item_id": 5 }
  ]
}
```

- `split_ratios` の `ratio` の合計は 100 である必要がある
- 対象エントリの `needs_settlement` を `false` に更新
- 支払フロー（`payments`）を自動計算して保存

**レスポンス `201`:** 作成された精算レコード

---

## 精算詳細 `/api/settlement/[id]`

### GET /api/settlement/[id] — 精算詳細取得

**レスポンス `200`:** 精算レコード + 対象エントリ一覧（ユーザーアバター付き）

### PATCH /api/settlement/[id] — 精算キャンセル

リクエストボディ不要。`cancelled_at` を現在時刻に設定し、対象エントリの `needs_settlement` を `true` に戻す。

**レスポンス `200`:** 更新後の精算レコード

---

## プロフィール `/api/profile`

### GET /api/profile — プロフィール取得

**レスポンス `200`:**
```json
{ "display_name": "田中太郎" }
```

### PATCH /api/profile — 表示名更新

**リクエストボディ:**
```json
{ "display_name": "田中次郎" }
```

同じ世帯内で重複する表示名は `409 Conflict` を返す。

**レスポンス `200`:** 更新後のプロフィール

---

## レポート `/api/report/monthly`

### GET /api/report/monthly?months=12 — 月別収支サマリー

**クエリパラメータ:** `months`（取得月数、デフォルト 12）

**レスポンス `200`:**
```json
{
  "data": [
    { "month": "2025-01", "income": 250000, "expense": 180000, "balance": 70000 },
    { "month": "2025-02", "income": 250000, "expense": 210000, "balance": 40000 }
  ]
}
```

---

## ログアウト `/api/logout`

### GET /api/logout

Supabase セッションをサインアウトし、`/login` へリダイレクト。
