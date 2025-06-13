# CloudFlare Images アップロードガイド

このガイドでは、2,577個の画像ファイルをCloudFlare Imagesにアップロードし、images.geojsonを更新して、ローカルファイルを削除する完全なプロセスを説明します。

## 📋 事前準備

### 1. 環境変数の設定
```bash
export CLOUDFLARE_IMAGES_API_TOKEN="your_cloudflare_images_api_token_here"
```

### 2. 依存関係の確認
```bash
npm install form-data node-fetch
```

## 🚀 実行手順

### ステップ 1: アップロード開始
```bash
# アップロード開始
node upload_to_cloudflare.js start

# 統計確認
node upload_to_cloudflare.js stats

# 失敗したファイルの再試行
node upload_to_cloudflare.js retry
```

### ステップ 2: images.geojson更新
```bash
# 更新プレビュー
node update_images_geojson.js preview

# 実際に更新
node update_images_geojson.js update

# バックアップから復元（必要時）
node update_images_geojson.js restore
```

### ステップ 3: ローカルファイル削除
```bash
# 削除プレビュー
node cleanup_local_files.js preview

# 実際に削除（要確認）
node cleanup_local_files.js cleanup --confirm

# 空ディレクトリ削除
node cleanup_local_files.js dirs

# ステータス確認
node cleanup_local_files.js status
```

## 🔄 レジューム機能

### アップロードの中断と再開
```bash
# Ctrl+C で中断
# 再開は同じコマンドで
node upload_to_cloudflare.js start
```

### 進行状況ファイル
- `upload_progress.json`: アップロード進行状況
- `cleanup_log.json`: 削除ログ
- `images.geojson.backup`: 自動バックアップ

## 📊 処理概要

### 1. upload_to_cloudflare.js
- **機能**: 画像をCloudFlare Imagesにアップロード
- **レジューム**: 中断・再開可能
- **進行管理**: バッチ処理（10ファイル毎に保存）
- **レート制限**: 1秒間隔でアップロード
- **出力**: 進行状況とアップロード結果のJSON

### 2. update_images_geojson.js
- **機能**: images.geojsonのパスをCloudFlare URLに更新
- **バックアップ**: 自動的にバックアップ作成
- **更新項目**:
  - `path`: CloudFlareのpublicバリアント
  - `mid_thumbs`: CloudFlareのmidバリアント
  - `small_thumbs`: CloudFlareのsmallバリアント
  - `cloudflare_id`: CloudFlareの画像ID
  - `upload_time`: アップロード時刻
  - `original_path`: 元のローカルパス

### 3. cleanup_local_files.js
- **機能**: アップロード済みローカルファイルの削除
- **対象フォルダ**: images/, mid_thumbs/, small_thumbs/
- **安全確認**: images.geojson更新済み確認
- **削除ログ**: 削除したファイルの記録

## ⚠️ 重要な注意事項

### 1. バックアップ
- images.geojsonは自動バックアップされます
- 元画像ファイルのバックアップは別途作成してください

### 2. 実行順序
1. **アップロード完了まで待つ**
2. **images.geojson更新**
3. **アプリケーション動作確認**
4. **ローカルファイル削除**

### 3. エラー時の対応
```bash
# アップロード失敗の再試行
node upload_to_cloudflare.js retry

# geojson復元
node update_images_geojson.js restore

# 進行状況リセット
node upload_to_cloudflare.js reset
```

## 🔧 設定項目

### upload_to_cloudflare.js
```javascript
const CONFIG = {
    BATCH_SIZE: 10,           // バッチサイズ
    DELAY_BETWEEN_UPLOADS: 1000,  // アップロード間隔(ms)
    PROJECT_PREFIX: 'tatebayashi_stones',  // プレフィックス
    CUSTOM_IMAGES_DOMAIN: 'img.code4history.dev'  // カスタムドメイン
};
```

## 📈 期待される結果

### アップロード完了後
- 2,577個の画像がCloudFlare Imagesに保存
- 各画像に3つのバリアント（public, mid, small）
- images.geojsonのパスがCloudFlare URLに更新
- ローカルファイル（約2,577×3 = 7,731ファイル）の削除

### URL例
```
https://img.code4history.dev/tatebayashi_stones_123_1234567890_abc123/public
https://img.code4history.dev/tatebayashi_stones_123_1234567890_abc123/mid
https://img.code4history.dev/tatebayashi_stones_123_1234567890_abc123/small
```

## 🆘 トラブルシューティング

### アップロードエラー
- API トークンの確認
- ネットワーク接続の確認
- CloudFlare Images の容量確認

### ファイルが見つからないエラー
- パスの確認
- ファイル権限の確認

### 処理の確認
```bash
# 全体統計
node upload_to_cloudflare.js stats
node update_images_geojson.js preview
node cleanup_local_files.js status
```