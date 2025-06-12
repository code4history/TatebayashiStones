# Tatebayashi Stones Image Processor Worker

Cloudflare Workerを使用した画像アップロードシステムです。アップロードされた画像をCloudflare Imagesに保存し、自動的に各種サイズのバリアントを提供します。

## 機能

- 画像のアップロード（JPEG, PNG, WebP対応）
- UUID による一意なファイル名の生成（`プロジェクト名_UUID`形式）
- Cloudflare Imagesによる自動バリアント生成
  - public: オリジナルサイズ
  - mid: 800x600相当
  - small: 400x300相当
- 認証トークンによるアクセス制御
- メタデータの保存（オリジナルファイル名、アップロード日時など）

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
- `CLOUDFLARE_ACCOUNT_ID`: CloudflareアカウントID（公開可能）
- `CLOUDFLARE_IMAGES_ACCOUNT_HASH`: ImagesのアカウントハッシュURLに含まれる値（公開可能）
- `PROJECT_PREFIX`: プロジェクト名のプレフィックス（例: `tatebayashi_stones`）
- `CORS_ORIGIN`: CORS許可オリジン（デフォルト: `*`）

### 3. Cloudflare Imagesのセットアップ

1. Cloudflareダッシュボードで「Images」を有効化
2. 必要なバリアントを作成：
   - `public`: Flexible（オリジナルサイズ）
   - `mid`: 800x600, Fit: Contain
   - `small`: 400x300, Fit: Contain

### 4. シークレットの設定

以下のシークレットをWrangler CLIで設定します：

```bash
# アップロードエンドポイントの認証トークン
wrangler secret put AUTH_TOKEN

# Cloudflare Images APIトークン
wrangler secret put CLOUDFLARE_IMAGES_API_TOKEN
```

**重要**: これらのトークンは秘密情報です。絶対にGitHubにコミットしないでください。

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
curl -X POST https://your-worker-domain.workers.dev/upload \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -F "image=@/path/to/image.jpg"
```

### レスポンス例

```json
{
  "success": true,
  "id": "tatebayashi_stones_123e4567-e89b-12d3-a456-426614174000",
  "uuid": "123e4567-e89b-12d3-a456-426614174000",
  "filename": "image.jpg",
  "size": 1234567,
  "type": "image/jpeg",
  "uploadedAt": "2024-01-01T00:00:00.000Z",
  "variants": [
    "https://imagedelivery.net/nPUB0SeeEPqgGoF9i-9JRg/tatebayashi_stones_123e4567-e89b-12d3-a456-426614174000/public",
    "https://imagedelivery.net/nPUB0SeeEPqgGoF9i-9JRg/tatebayashi_stones_123e4567-e89b-12d3-a456-426614174000/mid",
    "https://imagedelivery.net/nPUB0SeeEPqgGoF9i-9JRg/tatebayashi_stones_123e4567-e89b-12d3-a456-426614174000/small"
  ],
  "urls": {
    "original": "https://imagedelivery.net/nPUB0SeeEPqgGoF9i-9JRg/tatebayashi_stones_123e4567-e89b-12d3-a456-426614174000/public",
    "mid": "https://imagedelivery.net/nPUB0SeeEPqgGoF9i-9JRg/tatebayashi_stones_123e4567-e89b-12d3-a456-426614174000/mid",
    "small": "https://imagedelivery.net/nPUB0SeeEPqgGoF9i-9JRg/tatebayashi_stones_123e4567-e89b-12d3-a456-426614174000/small"
  }
}
```

### 画像へのアクセス

アップロードされた画像には以下のURLパターンでアクセスできます：

#### デフォルトURL（imagedelivery.net）
```
https://imagedelivery.net/[アカウントハッシュ]/[画像ID]/[バリアント名]
```

例：
- オリジナル画像: `https://imagedelivery.net/nPUB0SeeEPqgGoF9i-9JRg/tatebayashi_stones_123e4567/public`
- 中サムネイル: `https://imagedelivery.net/nPUB0SeeEPqgGoF9i-9JRg/tatebayashi_stones_123e4567/mid`
- 小サムネイル: `https://imagedelivery.net/nPUB0SeeEPqgGoF9i-9JRg/tatebayashi_stones_123e4567/small`

#### Worker経由のURL（リダイレクト）
Workerドメイン経由でアクセスすると、自動的にCloudflare ImagesのURLへリダイレクトされます：
```
https://img.code4history.dev/[画像ID]/[バリアント名]
```

例：
- オリジナル画像: `https://img.code4history.dev/tatebayashi_stones_123e4567/public`
- 中サムネイル: `https://img.code4history.dev/tatebayashi_stones_123e4567/mid`
- 小サムネイル: `https://img.code4history.dev/tatebayashi_stones_123e4567/small`

#### カスタムドメインURL（設定時）
```
https://[カスタムドメイン]/cdn-cgi/imagedelivery/[アカウントハッシュ]/[画像ID]/[バリアント名]
```

例：
- オリジナル画像: `https://code4history.dev/cdn-cgi/imagedelivery/nPUB0SeeEPqgGoF9i-9JRg/tatebayashi_stones_123e4567/public`

### カスタムドメインの設定

#### 方法1: 既存のCloudflareドメインを使用（推奨）

1. **DNS設定は不要** - 既にCloudflareでプロキシされているドメインならそのまま使用可能
2. wrangler.tomlで環境変数を設定：
   ```toml
   [vars]
   CUSTOM_IMAGES_DOMAIN = "code4history.dev"
   ```

#### 方法2: サブドメインを使用

1. CloudflareダッシュボードでDNSレコードを追加：
   ```
   Type: CNAME
   Name: images
   Target: code4history.dev（メインドメイン）
   Proxy status: Proxied（オレンジ色の雲）
   ```

2. wrangler.tomlで設定：
   ```toml
   [vars]
   CUSTOM_IMAGES_DOMAIN = "images.code4history.dev"
   ```

#### 方法3: Transform Rulesでカスタムパスを使用（Pro以上）

1. Cloudflareダッシュボード > Rules > Transform Rules > URL Rewrite Rules
2. 新規ルール作成：
   - Incoming: `https://code4history.dev/images/*`
   - Rewrite to: `https://code4history.dev/cdn-cgi/imagedelivery/nPUB0SeeEPqgGoF9i-9JRg/*`

3. wrangler.tomlで設定：
   ```toml
   [vars]
   CUSTOM_IMAGES_DOMAIN = "code4history.dev"
   CUSTOM_IMAGES_PATH = "/images"
   ```

**注意**: imagedelivery.netへの直接CNAMEは設定できません。必ず同じCloudflareアカウント内のドメインを使用してください。

## 注意事項

- **Cloudflare Imagesの料金**：
  - 保存枚数とデリバリー使用量に応じて料金が発生します
  - 詳細は[Cloudflare Images pricing](https://developers.cloudflare.com/images/pricing/)を参照
- **画像ID形式**：
  - `プロジェクト名_UUID`形式で生成されます
  - プロジェクト名は環境変数で変更可能です
- **バリアント設定**：
  - Cloudflareダッシュボードで事前に設定が必要です
  - バリアント名は本番環境に合わせて変更してください

## トラブルシューティング

### アップロードが失敗する場合

1. `CLOUDFLARE_IMAGES_API_TOKEN` が正しく設定されているか確認
2. Cloudflare Imagesが有効になっているか確認
3. APIトークンにImages:Edit権限があるか確認

### 認証エラーが発生する場合

1. `AUTH_TOKEN` が正しく設定されているか確認
2. リクエストヘッダーに正しいトークンが含まれているか確認

### 画像が表示されない場合

1. バリアント名が正しいか確認
2. 画像IDが正しいか確認
3. Cloudflareダッシュボードで画像が正常にアップロードされているか確認