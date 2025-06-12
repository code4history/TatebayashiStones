#!/bin/bash

# 使用方法: ./test-upload.sh <AUTH_TOKEN> <PROJECT_NAME> <IMAGE_PATH>

AUTH_TOKEN=$1
PROJECT_NAME=$2
IMAGE_PATH=$3

if [ -z "$AUTH_TOKEN" ] || [ -z "$PROJECT_NAME" ]; then
    echo "使用方法: ./test-upload.sh <AUTH_TOKEN> <PROJECT_NAME> <IMAGE_PATH>"
    echo "例: ./test-upload.sh your-secret-token tatebayashi_stones ../images/2/no2.JPG"
    exit 1
fi

if [ -z "$IMAGE_PATH" ]; then
    IMAGE_PATH="../images/2/no2.JPG"
fi

echo "アップロード中: $IMAGE_PATH (プロジェクト: $PROJECT_NAME)"

# URLを環境変数で切り替え可能に（プロジェクト名をクエリパラメータとして追加）
UPLOAD_URL=${UPLOAD_URL:-"https://img.code4history.dev/upload?project=$PROJECT_NAME"}

# ローカル開発の場合はコメントアウトを外す
# UPLOAD_URL="http://localhost:8787/upload?project=$PROJECT_NAME"

curl -X POST "$UPLOAD_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "image=@$IMAGE_PATH" \
  -w "\n"