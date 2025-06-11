# セキュリティ情報

## 公開しても安全な情報（GitHubにコミット可能）

- **Account ID** - CloudflareアカウントID
- **Zone ID** - CloudflareゾーンID  
- **バケット名** - R2バケット名
- **Worker名** - Workerの名前
- **カスタムドメイン** - 公開URLドメイン

これらのIDは、Cloudflareのリソースを特定するための識別子であり、それ自体では認証や認可には使用されません。

## 絶対に公開してはいけない情報（秘密情報）

- **AUTH_TOKEN** - API認証トークン
- **API Keys** - Cloudflare APIキー
- **API Tokens** - Cloudflare APIトークン
- **その他の認証情報**

## 秘密情報の管理方法

1. **Wrangler Secrets**（推奨）
   ```bash
   wrangler secret put AUTH_TOKEN
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