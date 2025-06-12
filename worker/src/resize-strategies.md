# 画像リサイズ戦略

## 1. Cloudflare Image Resizing（推奨）
- **必要条件**: Pro以上のプラン
- **メリット**: 高速、高品質、オンデマンド
- **実装状況**: ✅ 実装済み（index.js）

## 2. オンデマンドリサイズ（URLパラメータ）
- **必要条件**: Cloudflare Image Resizing
- **使用例**: `https://r2.code4history.dev/tatebayashi-stones/images/test.jpg?width=800&height=600`
- **実装状況**: ✅ 実装済み（index-with-cf-resize.js）

## 3. WebAssembly実装
- **候補**:
  - wasm-vips
  - photon
  - squoosh
- **メリット**: 無料プランでも使用可能
- **デメリット**: パフォーマンスが劣る、Worker内でのメモリ制限
- **実装状況**: ❌ 未実装（Workerでの動作確認が必要）

## 4. 外部APIサービス
- **候補**:
  - Cloudinary
  - ImageKit
  - Uploadcare
- **メリット**: 高機能、安定
- **デメリット**: 追加コスト、外部依存
- **実装状況**: ❌ 未実装

## 5. プリプロセッシング
- **方法**: アップロード前にクライアント側でリサイズ
- **メリット**: サーバー負荷なし
- **デメリット**: クライアント実装が必要
- **実装状況**: ❌ 未実装

## 現在の実装

現在の実装（index.js）では：
1. Cloudflare Image Resizingが利用可能な場合：適切なサムネイルを生成
2. 利用不可の場合：元画像をそのままサムネイルフォルダにコピー

これにより、どちらの環境でも動作する柔軟な実装になっています。