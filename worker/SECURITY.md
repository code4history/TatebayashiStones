# セキュリティ情報

## 公開しても安全な情報（GitHubにコミット可能）

- **Account ID** - CloudflareアカウントID
- **Zone ID** - CloudflareゾーンID  
- **Images Account Hash** - Cloudflare ImagesのアカウントハッシュURL内の識別子
- **Worker名** - Workerの名前
- **プロジェクトプレフィックス** - 画像ID生成用のプレフィックス

これらのIDは、Cloudflareのリソースを特定するための識別子であり、それ自体では認証や認可には使用されません。

## 絶対に公開してはいけない情報（秘密情報）

- **AUTH_TOKEN** - API認証トークン
- **CLOUDFLARE_IMAGES_API_TOKEN** - Cloudflare Images APIトークン
- **API Keys** - Cloudflare APIキー
- **その他の認証情報**

## 秘密情報の管理方法

1. **Wrangler Secrets**（推奨）
   ```bash
   wrangler secret put AUTH_TOKEN
   wrangler secret put CLOUDFLARE_IMAGES_API_TOKEN
   ```

2. **Cloudflareダッシュボード**
   - Workers & Pages > 該当Worker > Settings > Variables
   - 「Encrypt」ボタンで暗号化

3. **ローカル開発用 .env ファイル**
   - `.env`ファイルは`.gitignore`に追加済み
   - `.env.example`をテンプレートとして使用

## セキュリティベストプラクティス

1. 定期的にAUTH_TOKENを更新する
2. 最小権限の原則に従ってAPIトークンを設定する
3. アクセスログを定期的に確認する
4. 不審なアクセスパターンを監視する