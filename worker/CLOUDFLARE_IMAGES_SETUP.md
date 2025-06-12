# Cloudflare Images Variants Setup

## 重要: Variantsエラーについて

現在、`ERROR 9425: Image access denied: This account doesn't have variant with this name` というエラーが発生しています。これは、Cloudflare Imagesアカウントに必要なvariantsが設定されていないためです。

**注意**: `public`バリアントはCloudflare Imagesのデフォルトバリアントですが、`mid`と`small`バリアントはカスタムバリアントとして作成する必要があります。

## Variantsの設定

Cloudflare Imagesでは、アップロードされた画像に対して自動的にリサイズされたバリアントを作成できます。このプロジェクトでは以下の3つのバリアントを使用しています：

1. **public** - オリジナルサイズ（デフォルトで存在）
2. **mid** - 中サイズ (800x600相当) ※要作成
3. **small** - 小サイズ (400x300相当) ※要作成

## Cloudflare Dashboardでのバリアント設定方法

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にログイン
2. アカウントを選択
3. 左側のメニューから「Images」を選択
4. 「Variants」タブをクリック
5. 「Create variant」ボタンをクリック
6. 以下の設定でバリアントを作成：

### publicバリアント
- Name: `public`
- Resize: `Scale down`
- Width: 空欄（制限なし）
- Height: 空欄（制限なし）
- Format: `Auto`

### midバリアント
- Name: `mid`
- Resize: `Scale down`
- Width: `800`
- Height: `600`
- Format: `Auto`

### smallバリアント
- Name: `small`
- Resize: `Scale down`
- Width: `400`
- Height: `300`
- Format: `Auto`

## Transform Rulesの設定（カスタムドメイン用）

img.code4history.devでCloudflare Imagesにアクセスするには、Transform Rulesを設定する必要があります：

1. Cloudflare Dashboardで「Rules」→「Transform Rules」→「Rewrite URL」タブを選択
2. 「Create rule」をクリック
3. 以下の設定でルールを作成：

### Rule name
`Cloudflare Images Custom Domain`

### If (条件)
- Field: `Hostname`
- Operator: `equals`
- Value: `img.code4history.dev`

### Then (アクション)
- Rewrite to: `Dynamic`
- Expression: `concat("/cdn-cgi/imagedelivery/nPUB0SeeEPqgGoF9i-9JRg", http.request.uri.path)`

4. 「Deploy」をクリック

これにより、`https://img.code4history.dev/IMAGE_ID/VARIANT`形式でアクセスできるようになります。

## 確認方法

設定が正しく行われているか確認するには：

```bash
# publicバリアント（オリジナル）
curl -I https://img.code4history.dev/tatebayashi_stones_dcfba4c3-91e0-4537-8551-d2975b408b1b/public

# midバリアント
curl -I https://img.code4history.dev/tatebayashi_stones_dcfba4c3-91e0-4537-8551-d2975b408b1b/mid

# smallバリアント
curl -I https://img.code4history.dev/tatebayashi_stones_dcfba4c3-91e0-4537-8551-d2975b408b1b/small
```

正常に設定されていれば、200 OKレスポンスが返されます。