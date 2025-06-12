#!/bin/bash

# 使用方法: ./test-upload.sh <AUTH_TOKEN> <IMAGE_PATH>

AUTH_TOKEN=$1
IMAGE_PATH=$2

if [ -z "$AUTH_TOKEN" ]; then
    echo "使用方法: ./test-upload.sh <AUTH_TOKEN> <IMAGE_PATH>"
    echo "例: ./test-upload.sh your-secret-token ../images/2/no2.JPG"
    exit 1
fi

if [ -z "$IMAGE_PATH" ]; then
    IMAGE_PATH="../images/2/no2.JPG"
fi

echo "アップロード中: $IMAGE_PATH"

# URLを環境変数で切り替え可能に
UPLOAD_URL=${UPLOAD_URL:-"http://localhost:8787/upload"}

# 本番環境の場合はコメントアウトを外す
# UPLOAD_URL="https://tatebayashi-stones-image-processor.rekishikokudo.workers.dev/upload"

curl -X POST "$UPLOAD_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "image=@$IMAGE_PATH" \
  -w "\n"