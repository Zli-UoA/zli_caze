# Caze 認証・認可計画

AuthZ メンバー / ゲスト / Zli 管理者の 3 系統で、コメント投稿とルーム管理を分離する。

## 0. 前提

- 「authz」は Zli の AuthZ (`https://account.zli.works`) を指す。回答の `account.zli.work` は DNS が引けないため、現在の本番ドメイン `account.zli.works` を前提とする。
- AuthZ は OIDC (Authorization Code + PKCE S256) を提供し、`groups` scope でグループ識別子を返す。
- Caze は Cloudflare Workers + Void。認証とルームメタデータのために D1 を追加する。
- ルームの実体はこれまでどおり Durable Stream (`/streams/:roomId`)。ルームの一覧・作成・ゲスト招待は D1 で管理する。
- 既存ルームと既存コメントは破棄する。移行・取り込みは行わない。

### 0.1 決定事項（2026-11-07）

- AuthZ の本番 URL は `https://account.zli.works`。
- メンバーは **AuthZ でログインできる全ユーザー**。`caze-member` などの追加グループでは制限しない。
- ゲストは **ルーム単位の招待**。イベント共通コードは作らない。
- 既存ルーム・既存コメントは **破棄**。旧 URL は 404 になる。
- 管理者は **AuthZ グループ `zli-officers`** の所属で判定する（`CAZE_ADMIN_GROUP=zli-officers`）。
- ルーム閲覧はルームごとに選ぶ。`link` は「URL を知っている人はログイン不要で閲覧可」、`members` は「メンバー/ゲスト/管理者だけ閲覧可」。既定はイベント投影を優先して `link`。
- コメント削除・通報・モデレーションは今回の対象外。必要になったら別途設計する。

## 1. ゴール

1. **メンバー**: AuthZ でログインし、ルームにコメントを投稿できる。
2. **ゲスト**: 企業エンジニアやイベント参加者は AuthZ アカウントなしで、招待されたルームだけにコメントできる。
3. **管理者**: AuthZ でログインし、Zli の管理グループに属する場合だけルーム一覧・ルーム作成・ゲスト招待を操作できる。
4. コメントの表示名・投稿者 ID・権限は必ずサーバー側で確定する。クライアントの自己申告を信用しない。

### 非ゴール

- 一般メンバー向けのルーム一覧・ルーム作成
- ゲストの永続アカウント、複数ルーム横断のゲスト権限
- コメント削除・通報・モデレーション UI（今回は不要。将来の拡張）
- 既存ルーム・既存コメントの移行
- AuthZ のパスキー登録や招待の運用変更（AuthZ 側の既存運用に任せる）

## 2. 役割と権限

| 操作                           | 匿名 | メンバー | ゲスト               | 管理者 |
| ------------------------------ | ---- | -------- | -------------------- | ------ |
| AuthZ でログイン               | -    | ✓        | -                    | ✓      |
| ゲストコードで参加             | -    | -        | ✓                    | -      |
| ルーム閲覧（`link` ルーム）    | ✓ ※  | ✓        | 招待されたルームのみ | ✓      |
| ルーム閲覧（`members` ルーム） | ✗    | ✓        | 招待されたルームのみ | ✓      |
| コメント投稿                   | ✗    | ✓        | 招待されたルームのみ | ✓      |
| ルーム一覧                     | ✗    | ✗        | ✗                    | ✓      |
| ルーム作成                     | ✗    | ✗        | ✗                    | ✓      |
| ゲスト招待の発行・失効         | ✗    | ✗        | ✗                    | ✓      |
| 管理画面 (`/admin`)            | ✗    | ✗        | ✗                    | ✓      |

※ `link` は「URL を知っている人だけが閲覧できる（ルーム一覧には出ない）」状態。`members` は「メンバー/ゲスト/管理者だけが閲覧できる」状態。どちらもコメント投稿には AuthZ ログインまたはゲスト参加が必要。

### 2.1 ルーム閲覧ポリシー（`link` / `members`）

- `link`: ルームの URL を知っている人だけが閲覧できる。ログインは不要。ルーム一覧には出ない。イベント会場の投影向け。
- `members`: AuthZ メンバー、招待済みゲスト、管理者だけが閲覧できる。社内・機密向け。
- 投稿はどちらも認証が必要。`link` でも匿名投稿はできない。
- ゲストセッションは招待されたルーム以外を 403 にする（`link` ルームでも同様。ログアウトすれば匿名閲覧はできる）。
- 管理者がルーム作成時に選び、後から変更できる。既定は `link`。

### 管理者の定義

- 管理者は AuthZ グループ **`zli-officers`** の所属で判定する（決定済み）。
- AuthZ 自体の管理権限（`is_admin`）は OIDC の `groups` claim には出ない。Caze の管理者判定には `zli-officers` グループを使う。
- `CAZE_ADMIN_GROUP=zli-officers` を設定する。AuthZ 管理画面 `/admin/groups` で `zli-officers` のメンバーを管理する。
- `groups` scope と本人の同意が必要。グループ変更は次回ログイン時に反映される。即時失効が必要なら、管理者セッションの短命化または AuthZ UserInfo の再確認を追加する。
- 初期管理者は `zli-officers` に追加された後に Caze へログインする。緊急時用に `CAZE_ADMIN_SUBS` の allowlist を用意してもよい。

## 3. 全体構成

```text
Browser
  │
  ├─ /api/auth/*  ──> Void auth (Better Auth) ──> AuthZ OIDC
  │                         │
  │                         └─ D1: user / session / account
  │
  ├─ /join/:token ──> ゲスト参加 (D1: guest_invites / guest_sessions)
  │
  ├─ /room/:id ─────> page loader で Principal を解決
  │                         │
  │                         ├─ D1: rooms
  │                         └─ Durable Stream: comments
  │
  └─ /streams/:id ──> ストリームルートで Principal とルーム権限を検証
```

### 3.1 AuthZ 側の設定

AuthZ の管理画面で Caze 用の OIDC サービスを登録する。

| 項目                     | 値                                                   |
| ------------------------ | ---------------------------------------------------- |
| サービス名               | Caze                                                 |
| client 種別              | **confidential**（トークン交換をサーバーで行うため） |
| Redirect URI             | `https://<caze-domain>/api/auth/callback/authz`      |
| Post logout redirect URI | `https://<caze-domain>/`                             |
| Scope                    | `openid profile email groups`                        |
| PKCE                     | S256（AuthZ 必須）                                   |
| 署名方式                 | RS256（AuthZ の新規登録既定）                        |
| グループ                 | `zli-officers` のメンバーを Zli 管理者として扱う     |

Local 開発用に `http://localhost:5173/api/auth/callback/authz` も登録する。AuthZ 側の制約で localhost が使えない場合は、後述の開発用バイパスを使う。

AuthZ は public client（secret なし + PKCE）もサポートしている。Caze は token 交換を Worker 上で行うため、secret を保持できる confidential client を第一候補とする。public client にする場合は `tokenEndpointAuth: { method: "none" }` とし、client secret を要求しない設定に切り替える。

`email` scope は AuthZ が生成する `<id>@user.zli.works` を返すだけで、本人の実メールではない。**メール送信・パスワードリセット・通知には使わない。**

### 3.2 メンバー / 管理者のログイン

Void の組み込み Auth (Better Auth) に `genericOAuth` プラグインで AuthZ を追加する。

```ts
// auth.ts（新規）
import { defineAuth } from "void/auth";
import { genericOAuth } from "better-auth/plugins";

export default defineAuth(({ defaults, env }) => ({
  ...defaults,
  // AuthZ 以外のログイン手段は提供しない。メール送信・パスワードリセットも使わない。
  emailAndPassword: { enabled: false },
  user: {
    additionalFields: {
      authzSub: { type: "string", required: false, input: false },
      username: { type: "string", required: false, input: false },
      isAdmin: { type: "boolean", required: false, defaultValue: false, input: false },
      groups: { type: "string", required: false, input: false },
    },
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "authz",
          name: "AuthZ",
          discoveryUrl: `${String(env.AUTHZ_ISSUER).replace(/\/$/, "")}/.well-known/openid-configuration`,
          clientId: String(env.AUTHZ_CLIENT_ID),
          clientSecret: String(env.AUTHZ_CLIENT_SECRET),
          tokenEndpointAuth: { method: "client_secret_post" },
          scopes: ["openid", "profile", "email", "groups"],
          pkce: true,
          requireIdTokenVerification: true,
          overrideUserInfo: true,
          mapProfileToUser: (profile) => {
            const groups = Array.isArray(profile.groups) ? profile.groups : [];
            return {
              authzSub: String(profile.sub ?? ""),
              name: String(profile.name ?? profile.preferred_username ?? profile.sub ?? ""),
              username: String(profile.preferred_username ?? profile.sub ?? ""),
              ...(typeof profile.email === "string" ? { email: profile.email } : {}),
              isAdmin: groups.includes(String(env.CAZE_ADMIN_GROUP)),
              groups: JSON.stringify(groups),
            };
          },
        },
      ],
    }),
  ],
}));
```

実装時の確認点:

- `genericOAuth` の callback は `/api/auth/callback/authz`。AuthZ の Redirect URI と完全一致させる。
- `tokenEndpointAuth` は confidential client の登録方式に合わせる（`client_secret_post` を想定）。
- `mapProfileToUser` が返す `email` は AuthZ の `email` をそのまま使う。`emailVerified` は true にしない。
- `isAdmin` / `groups` / `authzSub` / `username` は `input: true` にして AuthZ プロフィールから更新し、`databaseHooks.user.update.before` で OAuth callback 以外からの更新を剥がす。`/update-user` による権限昇格を防ぐため。
- `better-auth` を `package.json` の依存に明示する（Void の推移依存に頼らない）。
- `void/auth` の `getUser()` がストリームルートでも動くことを確認する。動かない場合は `auth.api.getSession({ headers })` に切り替える。

ログイン UI は `authClient.signIn.social({ provider: "authz", callbackURL: next })` を使う。`next` は必ず同一 origin のパスに正規化する（open redirect 対策）。

### 3.3 ゲストのログイン

ゲストは AuthZ のアカウントを作らない。管理者が発行した**ルーム単位の招待コード**で参加する（決定済み）。イベント全体で同じコードを配りたい場合も、ルームごとに招待を発行して 1 ルーム 1 コードを維持する。

1. 管理者がルーム詳細でゲスト招待を発行する。
2. 招待 URL (`/join/:token`) を企業エンジニアやイベント参加者に配る。
3. ゲストは表示名を入力して参加する。
4. サーバーは招待の有効性（期限・回数・失効）を検証し、`guest_sessions` を作成する。
5. ゲストセッションは対象ルームにだけ紐づく。他のルーム・管理画面にはアクセスできない。

ゲストセッション:

- 本番は `__Host-caze_guest` Cookie（`HttpOnly; Secure; SameSite=Lax`）に 256 bit のランダムトークン。localhost の HTTP では `__Host-` が使えないため、開発時だけ `caze_guest`（Secure なし）に切り替える。
- D1 には SHA-256 ハッシュだけを保存する。
- 有効期限は招待の期限とセッション期限の短い方。イベント用途の既定は 12 時間。
- ログアウトでセッションを削除する。招待の失効で新規参加を止め、必要なら既存セッションも削除する。
- 招待コードは 128 bit 以上。URL に載るため `Referrer-Policy: no-referrer` と `Cache-Control: no-store` を付ける。

ゲストの表示名は 1〜30 文字。空文字・制御文字を拒否する。同名を許可する場合は、コメント一覧で「ゲスト」バッジを付けて区別する。セッション中の表示名変更は初期実装では提供しない（変更したい場合は招待から再参加する）。

### 3.4 Principal の解決

認証主体は既存の Canvas 用 `Viewer` と混同しないよう **`Principal`** と呼ぶ。

```ts
type Principal =
  | {
      type: "member";
      userId: string; // Better Auth の user.id
      authzSub: string;
      name: string;
      isAdmin: boolean;
    }
  | {
      type: "guest";
      sessionId: string;
      roomId: string;
      name: string;
    };
```

- `middleware/01.viewer.ts` で `Principal` を解決し、`c.set("shared", { principal })` に入れる。`/api/auth/*` と静的アセットではゲスト解決をスキップする。
- `CloudContextVariables` に `shared.principal` を augment し、レイアウトは `useShared()` でヘッダーのログイン状態を描画する。
- ページローダー / API ルートは `src/server/principal.ts` のヘルパーで再検証する。
- メンバーセッションがある場合はゲストセッションより優先する。メンバーがログインしたらゲスト Cookie を削除する。

```ts
// src/server/permissions.ts（新規）
export const canViewRoom = (principal: Principal | null, room: Room): boolean;
export const canPostComment = (principal: Principal | null, room: Room): boolean;
export const canListRooms = (principal: Principal | null): boolean;
export const canCreateRoom = (principal: Principal | null): boolean;
export const canManageRoom = (principal: Principal | null, room: Room): boolean;
```

権限判定を 1 箇所に集約し、ページ・API・ストリームで同じ関数を使う。

### 3.5 採用理由と代替案

- **Void auth + Better Auth を採用する理由**: セッション Cookie、CSRF、レート制限、D1 のユーザー/セッションテーブルを自前で実装せずに済む。`genericOAuth` が AuthZ の OIDC discovery / PKCE / ID token 検証に対応している。
- **D1 を追加する理由**: ルーム一覧・ルーム作成・ゲスト招待は Durable Stream では列挙・検索できない。認証テーブルとルームメタデータを同じ D1 に置く。
- **ゲストを別セッションにする理由**: ゲストは AuthZ アカウントを持たず、ルーム単位で失効させる必要がある。Better Auth の匿名ユーザーに寄せるより、招待とルームに直接紐づく専用セッションの方が権限境界を説明しやすい。
- **代替案**: zeee と同様に OIDC クライアントとセッションを完全自前で実装する方法もある。ただしログイン状態の更新・CSRF・セッション失効を自前で持つことになるため、今回は Void auth を優先する。

## 4. データモデル

### 4.1 D1 テーブル

```text
rooms
  id            text primary key       -- 既存の roomId と同じ。Durable Stream の ID
  title         text not null
  status        text not null          -- 'active' | 'archived'
  visibility    text not null          -- 'link' | 'members'（初期は link）
  created_by    text not null          -- Better Auth user.id
  created_at    text not null
  updated_at    text not null

guest_invites
  id            text primary key
  room_id       text not null references rooms(id) on delete cascade
  token_hash    text not null unique
  label         text not null          -- 企業名・イベント名など
  expires_at    text not null
  max_uses      integer not null       -- 0 = 無制限
  used_count    integer not null default 0
  created_by    text not null
  created_at    text not null
  revoked_at    text

guest_sessions
  id            text primary key
  token_hash    text not null unique
  invite_id     text not null references guest_invites(id) on delete cascade
  room_id       text not null references rooms(id) on delete cascade
  display_name  text not null
  created_at    text not null
  expires_at    text not null
  last_seen_at  text
  revoked_at    text

admin_audit_log（推奨）
  id            text primary key
  actor_user_id text not null
  action        text not null          -- 'room.create' | 'invite.create' | 'invite.revoke' など
  target_id     text
  detail        text
  created_at    text not null
```

インデックス:

- `rooms(status, created_at)`
- `guest_invites(room_id, revoked_at, expires_at)`
- `guest_invites(token_hash)` unique
- `guest_sessions(token_hash)` unique
- `guest_sessions(room_id, expires_at)`

招待の利用回数は `UPDATE ... WHERE used_count < max_uses OR max_uses = 0` のような条件付き UPDATE で原子的に増やす。同時参加で上限を超えないことをテストする。

Better Auth の `user` / `session` / `account` / `verification` テーブルは Void が生成する。`db/schema.ts` に重複定義せず、`void db generate` の出力を確認してコミットする。

### 4.2 Better Auth のユーザー

- `user.id`: Caze 内の安定 ID。コメントの `authorId` に使う。
- `user.name`: AuthZ の表示名。
- `user.username`: AuthZ の `preferred_username`。
- `user.isAdmin`: `groups` に `CAZE_ADMIN_GROUP`（例: `zli-officers`）が含まれるか。
- `user.groups`: デバッグ用に JSON 文字列で保存（表示には使わない）。
- `account` テーブル: AuthZ の `sub` / issuer / access token など Better Auth 管理。

`email` は AuthZ の生成値を使うが、ログイン手段には使わない。`emailAndPassword` とメール送信は無効化する。

### 4.3 コメントスキーマ

```ts
// src/schema/message.ts
export const comment = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  content: z.string().min(1).max(100),
  user: z.string().min(1).max(100),
  authorId: z.string().min(1).max(128),
  authorType: z.enum(["member", "guest", "admin"]),
  isOptimistic: z.boolean(),
});
```

- 新規コメントはサーバーが `user` / `authorId` / `authorType` / `createdAt` / `isOptimistic` を上書きする。
- `user` は投稿時点の表示名を保存する。後で AuthZ の表示名を変えても過去コメントの表示名は変えない。
- クライアントの楽観コメントは、ルームローダーで受け取った Principal の `userId` / `sessionId` と `type` を `authorId` / `authorType` に入れる。サーバーは最終値を上書きする。
- 既存ルームは破棄するため、旧コメントとの互換性は考慮しない。
- クライアントが送った `user` は楽観表示にだけ使い、サーバーは無視する。

## 5. 画面とルート

### 5.1 公開 / 認証

| パス                  | 内容                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/`                   | ログインの入口。「AuthZ でログイン」と「ゲストコードで参加」を表示。ログイン済みなら部屋 ID 入力と管理者リンクを表示。   |
| `/api/auth/*`         | Void auth / Better Auth。AuthZ callback を含む。                                                                         |
| `/login`              | AuthZ ログインへリダイレクトする薄いページ（任意）。                                                                     |
| `/logout`             | メンバーは Better Auth + AuthZ end-session、ゲストはゲストセッション削除。                                               |
| `/join/[token]`       | ゲスト参加フォーム（表示名入力）。`no-store`。                                                                           |
| `/room/[roomId]`      | `link` ルームは匿名閲覧可（投稿はログイン/ゲスト参加）。`members` ルームは閲覧もログイン必須。ゲストは自分のルームだけ。 |
| `/room/[roomId]/view` | 投影ページ。`link` なら匿名で投影可。`members` ならルームと同じ認可を通す。                                              |

### 5.2 管理

| パス                    | 内容                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/admin`                | 管理トップ（ルーム一覧への入口）                                                                                      |
| `/admin/rooms`          | ルーム一覧。タイトル・ID・状態・閲覧ポリシーを表示。検索（初期実装は上限100件）。                                     |
| `/admin/rooms/new`      | ルーム作成。タイトル、任意のルーム ID、閲覧ポリシー（`link` / `members`）。作成後にストリームを用意してルームへ遷移。 |
| `/admin/rooms/[roomId]` | ルーム詳細。ゲスト招待の発行・一覧・失効、閲覧ポリシーの変更、状態変更（将来）。                                      |

管理画面はローダー/アクションで `requireAdmin` を必ず通す。非管理者には 403 を返し、管理リンク自体も表示しない。

### 5.3 レイアウト / 既存 UI の変更

- `pages/layout.tsx`: `useShared().principal` でヘッダーを描画。表示名、ログイン/ログアウト、管理者メニュー。
- `pages/index.tsx`: `useShared().principal` で表示を切り替える。部屋 ID 入力はメンバー/管理者のみ。匿名時はログインカード。ゲストは自分のルームへのリンクのみ。
- `pages/room/[roomId].tsx`: `username` の localStorage 依存を削除。`principal.name` を表示。`link` ルームでは未ログインでも閲覧でき、投稿欄の代わりにログイン導線を出す。
- `src/app/lib/username.tsx`: 削除、または AuthZ プロフィール表示に置き換える。
- `src/app/components/collections/config.ts`: `username` キーを削除。UI 設定だけ残すなら `config` コレクションは存続。
- `src/app/components/collections/comments.ts`: `stream.create()` を削除。`preloadCommentsDB()` は既存ストリームの preload だけにする。

> 現在の「部屋 ID を入力して参加 = 実質ルーム作成」という挙動は廃止する。メンバーは管理者が作成済みのルームにだけ参加できる。新しいルームは `/admin/rooms/new` から管理者が作成する。

## 6. サーバー側の認可ポイント

### 6.1 ページローダー / アクション

- `/room/:roomId` のローダーで `canViewRoom` を検証する。`link` ルームは匿名も許可し、`members` ルームは Principal を必須にする。不可なら 403 またはログインへリダイレクト。`ssr = false` でもローダーはサーバーで動くため、ここで認可する。ローダーは画面表示と楽観コメント用に `principal` も返す。
- `/room/:roomId/view` も同じ判定を通す。`link` ルームは匿名で投影でき、`members` ルームは保護する。
- 管理ページのローダー/アクションで `canListRooms` / `canCreateRoom` / `canManageRoom` を検証する。
- ゲスト参加アクションで招待の期限・回数・失効を検証する。
- `next` パラメータは同一 origin のパスだけ許可する。

### 6.2 ストリームルート (`routes/streams/[...path].ts`)

| メソッド  | 変更                                                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET`     | ルームの存在と `canViewRoom` を検証。`link` ルームは匿名可、`members` ルームはメンバー/ゲスト/管理者のみ。                                                   |
| `POST`    | `canPostComment` を検証。コメントイベントの `user` を Principal の表示名に、`authorId` / `authorType` をサーバー値に置き換える。`createdAt` もサーバー時刻。 |
| `PUT`     | 外部からのストリーム作成を禁止する。ルーム作成はサーバー内部の `ensureRoomStream()` だけが行う。                                                             |
| `DELETE`  | 引き続き公開しない。                                                                                                                                         |
| `OPTIONS` | 既存どおり。CORS は有効にしない。                                                                                                                            |

追加の防御:

- `POST` / `PUT` は `Origin` が `PUBLIC_ORIGIN` と一致する場合だけ許可する（CSRF 対策）。`Origin` がない同一 origin のリクエストは許可してよいが、ブラウザからの POST は通常 `Origin` が付く。
- `forwardHeaders` から `authorization` を外す。Cookie 認証に統一する。
- StreamDB の fetch は same-origin なので Cookie は自動で付く。`credentials` の追加設定は不要だが、リバースプロキシ配下では `PUBLIC_ORIGIN` と実際の origin を一致させる。
- コメント本文は 1〜100 文字、ボディは既存の 64 KiB 制限を維持する。
- 可能ならコメント ID をサーバー生成にし、他人のコメント ID を再利用した上書きを防ぐ。クライアントの楽観更新は `txid` で reconciler する。

### 6.3 ルーム作成とストリーム

- 管理者がルームを作成したら、D1 に `rooms` を insert し、`ensureRoomStream(roomId)` で Durable Stream を PUT する。ルーム ID は既存の `[A-Za-z0-9_-]{1,64}` を維持し、未指定ならランダム ID を生成する。
- ルーム作成時に `visibility`（`link` / `members`）を保存する。
- ストリーム作成に失敗したらルームを `error` にするか削除し、管理者に再試行を促す。
- 既存ルームは破棄するため、D1 に登録しない。旧 URL は「存在しないルーム」として 404 を返す。
- クライアントの `stream.create()` は削除する。未登録ルームは「存在しない」として扱う。

### 6.4 セッション / CSRF

- Better Auth のセッション Cookie は既存の仕組みに任せる。
- ゲスト Cookie は `HttpOnly; Secure; SameSite=Lax`。
- 状態変更を伴う独自エンドポイントは `Origin` 検証を行う。Hono の `csrf()` を使ってもよい。
- ログアウト時はメンバー/ゲスト両方の Cookie を消す。
- ゲスト招待の試行回数にレート制限を設ける（IP あたり 10 回/分など）。

## 7. 実装フェーズ

### Phase 0: 前提準備

- [ ] AuthZ に Caze 用 OIDC サービスを登録（confidential、redirect URI、scopes）
- [ ] AuthZ の `zli-officers` グループを確認し、初期管理者を追加
- [ ] ルーム閲覧は既定 `link`、ルームごとに `members` を選べる方針を確認（決定済み）
- [ ] `CAZE_ADMIN_GROUP` などの環境変数名を決定
- [ ] D1 を追加する方針を確認（`void db generate` の migration を含む）

### Phase 1: 認証基盤 + メンバー/管理者ログイン

- [ ] `void.config.ts` / `env.ts` / `auth.ts` を追加
- [ ] `genericOAuth` で AuthZ ログイン、`emailAndPassword` 無効化
- [ ] `user.additionalFields` に `authzSub` / `username` / `isAdmin` / `groups`
- [ ] `middleware/01.viewer.ts` と `src/server/principal.ts`
- [ ] ログイン / ログアウト / AuthZ callback の UI
- [ ] 開発用バイパス（`routes/auth/dev.dev.ts`、`CAZE_DEV_AUTH=1`）
- [ ] ヘッダーのログイン状態、既存 `username` dialog の置き換え
- [ ] コメント投稿をメンバー/管理者だけに制限（ゲストは Phase 3 まで一時停止）
- [ ] README の「Room access is currently anonymous」記述を更新
- [ ] 単体テスト: `mapProfileToUser`、管理者判定、`safeNext`

**完了条件**: AuthZ でログインしたメンバーがコメントでき、未ログインでは投稿できない。管理者グループのユーザーだけが `isAdmin` として扱われる（管理画面自体は Phase 2 で追加）。

### Phase 2: ルームレジストリ + 管理者の一覧/作成

- [ ] `db/schema.ts` に `rooms` / `admin_audit_log`
- [ ] `void db generate` で migration を作成し、`void.lock.json` を更新
- [ ] `void prepare` でルート / 環境変数の型を再生成
- [ ] `src/server/rooms.ts`（一覧・作成・取得・`ensureRoomStream`）
- [ ] `/admin/rooms` 一覧、`/admin/rooms/new` 作成、`/admin/rooms/[roomId]` 詳細
- [ ] `pages/index.tsx` のルーム ID 入力はメンバー/管理者のみ
- [ ] ストリームルートの `GET` / `POST` / `PUT` をルーム権限で保護
- [ ] 閲覧ポリシー `link` / `members` の保存と判定
- [ ] テスト: 管理者以外の一覧/作成拒否、ルーム作成後のストリーム存在、未登録ルームの拒否、`link` の匿名閲覧、`members` の拒否

**完了条件**: 管理者がルーム一覧を見て新しいルームを作成でき、メンバーは ID/リンクで参加してコメントできる。

### Phase 3: ゲストログイン + 招待

- [ ] `guest_invites` / `guest_sessions` テーブルと migration
- [ ] `src/server/guest.ts`（招待発行・検証・セッション作成・失効）
- [ ] `/join/[token]` の GET/POST
- [ ] 管理者のルーム詳細に招待発行・一覧・失効 UI
- [ ] ゲスト Cookie と `Principal` 解決
- [ ] ストリームルートでゲストのルーム限定を強制
- [ ] コメントの `authorType: "guest"` とゲストバッジ
- [ ] テスト: 期限切れ・回数上限・失効・別ルームアクセス拒否・同時参加

**完了条件**: 招待 URL からゲストが表示名を入力して参加し、招待されたルームだけにコメントできる。ゲストはルーム一覧/作成/管理画面にアクセスできない。

### Phase 4: 堅牢化・運用

- [ ] コメント投稿のレート制限（Principal / ルーム単位）
- [ ] 管理操作の監査ログ
- [ ] 期限切れゲストセッション / 招待の定期削除（cron）
- [ ] ルームの archive
- [ ] 監視: ログイン失敗、ゲスト参加、管理者操作、ストリーム投稿エラー
- [ ] E2E: AuthZ 実機ログイン、グループ変更、ログアウト、招待失効

## 8. 移行と運用

### 8.1 環境変数 / シークレット

| 名前                  | 用途                             | 例                                   |
| --------------------- | -------------------------------- | ------------------------------------ |
| `AUTHZ_ISSUER`        | AuthZ issuer                     | `https://account.zli.works/api/auth` |
| `AUTHZ_CLIENT_ID`     | OIDC client ID                   | AuthZ の登録結果                     |
| `AUTHZ_CLIENT_SECRET` | confidential client secret       | `void secret put`                    |
| `PUBLIC_ORIGIN`       | redirect / Origin 検証           | `https://caze.zli.works`             |
| `CAZE_ADMIN_GROUP`    | 管理者グループ ID                | `zli-officers`                       |
| `CAZE_ADMIN_SUBS`     | 緊急時の管理者 allowlist（任意） | `sub1,sub2`                          |
| `CAZE_DEV_AUTH`       | 開発用ログイン（本番禁止）       | `1`                                  |
| `BETTER_AUTH_SECRET`  | Better Auth 署名鍵               | Void が自動生成                      |

### 8.2 デプロイ順序

1. AuthZ 側の client を登録し、`zli-officers` グループを確認する。
2. D1 migration を生成し、レビューしてコミットする。
3. `void secret put` で AuthZ の secret を設定する。
4. `void deploy --platform cloudflare` で D1 と Auth を有効化する。
5. 管理者で AuthZ ログインし、`groups` claim と `/admin` を確認する。
6. 既存ルームは破棄されるため、旧 URL が 404 になることを関係者に周知する。
7. メンバーに新しいログイン導線を案内する。
8. ゲスト招待を発行し、イベント/企業エンジニアに配る。

ロールバック:

- D1 の migration は追加のみにし、旧 Worker に戻しても新規ルームのストリームとコメントは読めるようにする。
- AuthZ 側の client を無効化すれば、新規ログインだけを止められる。発行済みセッションの即時失効は別途、ゲストセッション削除と Better Auth のセッション削除で行う。
- ゲスト招待は `revoked_at` で止められる。イベント中に問題が出た場合は、まず新規参加を止め、既存ゲストの投稿可否を別フラグで制御できるようにする。

### 8.3 既存ルームの扱い（破棄）

- 既存ルーム・既存コメントは D1 に移行しない。決定済み。
- 認証導入後、D1 に `rooms` がない旧ルームは 404 になる。
- 旧ストリームを残しておく必要はない。既知の旧ストリームがある場合は、Cloudflare 側で削除してよい。
- README の「旧データは失ってよい」という前提と整合する。

### 8.4 ローカル開発

- `.env` に AuthZ の開発用 client を設定する。
- AuthZ の localhost redirect が使えない場合は、`routes/auth/dev.dev.ts` で名前と管理者フラグを指定してログインできるようにする。
- 開発用バイパスは `.dev` ルートに閉じ込め、本番ビルドに含めない。`CAZE_DEV_AUTH` が本番で立っていても無効化する二重ガードにする。

## 9. セキュリティとテスト

### 9.1 主なリスクと対策

| リスク                           | 対策                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| クライアントが `user` を偽装     | サーバーで Principal の表示名に上書き                                                |
| ゲストが別ルームへアクセス       | セッションの `roomId` と URL を照合                                                  |
| ゲストが管理画面へアクセス       | `requireAdmin` を全管理ルートに適用                                                  |
| 招待コードの総当たり             | 128 bit 以上のトークン、レート制限、ハッシュ保存                                     |
| 招待の使い回し                   | 期限・回数上限・失効、条件付き UPDATE                                                |
| CSRF                             | `SameSite=Lax`、`Origin` 検証、Hono `csrf()`                                         |
| open redirect                    | `next` を同一 origin のパスだけ許可                                                  |
| 管理者権限の残留                 | 次回ログインで `groups` を再取得。必要なら短命セッション/UserInfo 再確認             |
| 管理者アカウントの侵害           | 認証は AuthZ のパスキーに任せ、Caze はパスワードを持たない。管理操作は監査ログに残す |
| コメント ID の再利用による上書き | 可能ならサーバー生成 ID、または ID 所有権の索引                                      |
| ルーム ID の推測                 | イベント用はランダム ID を使い、必要なら `visibility = 'members'` にする             |
| ログへの token 漏えい            | Authorization / Cookie / 招待 token をログに出さない                                 |

### 9.2 テスト一覧

- 権限マトリクス: 匿名 / メンバー / ゲスト / 管理者 × 閲覧 / 投稿 / 一覧 / 作成 / 招待
- ゲスト招待: 期限切れ、回数上限、失効、同時参加、別ルーム
- ストリーム: 未認証 POST の拒否、`user` 偽装の上書き、ゲストのルーム限定、`PUT` 拒否
- 管理: 非管理者の一覧/作成/招待拒否、作成後のストリーム存在、`link` / `members` の閲覧判定
- 閲覧: `link` ルームの匿名閲覧、`members` ルームの匿名拒否
- 認証: AuthZ callback、`groups` 判定、ログアウト、セッション失効、open redirect
- E2E: AuthZ 実機ログイン、ゲスト招待リンク、イベント投影ページ

各フェーズの完了時に `vp check` / `vp test` / `vp build` を通す。

## 10. 決定事項の反映

- ルーム閲覧は既定 `link`、ルームごとに `members` を選べる形で進める。
- 管理者グループは `zli-officers`（`CAZE_ADMIN_GROUP=zli-officers`）。
- コメント削除・通報・モデレーションは今回の対象外。
- 未決事項なし。この計画に沿って実装に進める。
