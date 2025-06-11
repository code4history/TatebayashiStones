# Tatebayashi Stones Image Processor Worker

Cloudflare Workerを使用した画像アップロード・処理システムです。アップロードされた画像をR2に保存し、自動的にサムネイルを生成します。また、R2の静的ファイル配信機能も提供します。

## 機能

- 画像のアップロード（JPEG, PNG, WebP対応）
- UUID による一意なファイル名の生成
- 自動サムネイル生成（中サイズ: 800x600、小サイズ: 400x300）
- R2 ストレージへの保存
- 認証トークンによるアクセス制御
- R2からの静的ファイル配信（MIMEタイプ自動判定）
- キャッシュヘッダーとETag対応

## セットアップ

### 1. 依存関係のインストール

```bash
cd worker
npm install
```

### 2. 環境変数の設定

`.env.example` を `.env` にコピーして、必要な値を設定してください：

```bash
cp .env.example .env
```

設定項目：
- `CLOUDFLARE_ACCOUNT_ID`: CloudflareアカウントID
- `R2_BUCKET_NAME`: R2バケット名
- `R2_PUBLIC_URL`: R2の公開URL（例: `https://61f248de47f07bdbf3dd2133a5378e64.r2.cloudflarestorage.com`）
- `AUTH_TOKEN`: API認証トークン
- `CORS_ORIGIN`: CORS許可オリジン
- `ZONE_ID`: CloudflareゾーンID（カスタムドメイン使用時）
- `CUSTOM_DOMAIN`: カスタムドメイン（例: `r2.code4history.dev`）

### 3. Zone IDの取得と設定

1. Cloudflareダッシュボード (https://dash.cloudflare.com/) にログイン
2. 対象ドメイン（code4history.dev）を選択
3. 右側のサイドバーの「API」セクションで「Zone ID」を確認
4. `wrangler.toml` の `zone_id` に設定

### 4. R2バケットの作成

Cloudflareダッシュボードで R2 バケットを作成し、以下の設定を行ってください：

1. バケット名を `wrangler.toml` の `bucket_name` と一致させる（例: `tatebayashi-stones`）
2. 公開アクセスは**不要**（Workerがバインディング経由でアクセスするため）
3. カスタムドメインも**不要**（Worker経由で配信するため）

### 5. シークレットの設定

認証トークンを設定します（これは絶対にGitHubにコミットしないでください）：

```bash
wrangler secret put AUTH_TOKEN
```

プロンプトが表示されたら、安全なトークン値を入力してください。

**重要**: `AUTH_TOKEN`は秘密情報です。以下の方法で管理してください：
- Wrangler CLIの`secret`コマンドを使用
- Cloudflareダッシュボードの環境変数設定を使用
- 絶対に`wrangler.toml`や`.env`ファイルに直接書かない（`.env`は`.gitignore`に追加済み）

## デプロイ

### 開発環境での実行

```bash
npm run dev
```

### 本番環境へのデプロイ

```bash
npm run deploy
```

## 使用方法

### 画像のアップロード

```bash
curl -X POST https://r2.code4history.dev \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -F "image=@/path/to/image.jpg"
```

### レスポンス例

```json
{
  "success": true,
  "uuid": "123e4567-e89b-12d3-a456-426614174000",
  "filename": "123e4567-e89b-12d3-a456-426614174000.jpg",
  "originalName": "image.jpg",
  "size": 1234567,
  "type": "image/jpeg",
  "paths": {
    "original": "images/123e4567-e89b-12d3-a456-426614174000.jpg",
    "mid": "mid_thumbs/123e4567-e89b-12d3-a456-426614174000.jpg",
    "small": "small_thumbs/123e4567-e89b-12d3-a456-426614174000.jpg"
  },
  "urls": {
    "original": "r2.code4history.dev/images/123e4567-e89b-12d3-a456-426614174000.jpg",
    "mid": "r2.code4history.dev/mid_thumbs/123e4567-e89b-12d3-a456-426614174000.jpg",
    "small": "r2.code4history.dev/small_thumbs/123e4567-e89b-12d3-a456-426614174000.jpg"
  }
}
```

### 静的ファイルへのアクセス

アップロードされたファイルには以下のURLパターンでアクセスできます：

```
https://r2.code4history.dev/[バケット名]/[ファイルパス]
```

例（バケット名が `tatebayashi-stones` の場合）：
- オリジナル画像: `https://r2.code4history.dev/tatebayashi-stones/images/123e4567-e89b-12d3-a456-426614174000.jpg`
- 中サムネイル: `https://r2.code4history.dev/tatebayashi-stones/mid_thumbs/123e4567-e89b-12d3-a456-426614174000.jpg`
- 小サムネイル: `https://r2.code4history.dev/tatebayashi-stones/small_thumbs/123e4567-e89b-12d3-a456-426614174000.jpg`

## 注意事項

- 現在の実装では画像リサイズ機能は簡易版です。本格的なリサイズ機能が必要な場合は：
  - Cloudflare Image Resizing（カスタムドメイン設定が必要）
  - Cloudflare Images API（別サービス）
  - WebAssemblyベースの画像処理ライブラリ
  などの導入を検討してください
- R2 ストレージの使用量に応じて料金が発生します
- 本番環境では `CORS_ORIGIN` を適切に設定してください
- `R2_PUBLIC_URL` はR2バケットの公開URLのルート部分を指定します

## トラブルシューティング

### サムネイル生成が失敗する場合

1. R2バケットの公開アクセスが有効になっているか確認
2. `R2_PUBLIC_URL` が正しく設定されているか確認
3. Cloudflare Image Resizing が有効になっているか確認

### 認証エラーが発生する場合

1. `AUTH_TOKEN` が正しく設定されているか確認
2. リクエストヘッダーに正しいトークンが含まれているか確認