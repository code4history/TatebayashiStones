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

curl -X POST http://localhost:8787/upload \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "image=@$IMAGE_PATH" \
  -w "\n" | jq .