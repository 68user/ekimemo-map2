#!/bin/sh

# ローカルテスト用スクリプト。
# static/ 以下についてポート 8080 で Web サーバを立てる。
# その後 GCP の Cloud Shell で「ウェブでプレビュー」でブラウザ閲覧などをする。

SCRIPT_DIR=$(cd $(dirname $0);pwd)
cd $SCRIPT_DIR/static

nohup python3 -m http.server --bind localhost 8080 &

