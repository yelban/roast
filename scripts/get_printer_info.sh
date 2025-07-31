#!/bin/bash

# --- 載入環境變數 ---
# 檢查 .env 檔案是否存在於當前目錄
if [ ! -f ../.env ]; then
    echo "錯誤：找不到 .env 檔案。"
    echo "請在對應目錄下建立一個 .env 檔案，並填入 USER, UKEY, 和 SN。"
    exit 1
fi

# 從 .env 檔案載入環境變數
source ../.env

# 檢查必要的變數是否已從 .env 成功載入
if [ -z "$USER" ] || [ -z "$UKEY" ] || [ -z "$SN" ] || [ "$SN" == "YOUR_SN_HERE" ]; then
    echo "錯誤：請確保 .env 檔案中已正確設定 USER, UKEY, 和 SN 變數。"
    exit 1
fi
# ---------------------------------

# 1. 設定 API 接口名稱
#    這是與前一個腳本唯一的不同之處
APINAME="Open_printerInfo"

# 2. 獲取當前的10位UNIX時間戳
STIME=$(date +%s)

# 3. 拼接 user + UKEY + stime
STRING_TO_SIGN="${USER}${UKEY}${STIME}"

# 4. 計算 SHA1 簽名 (轉換為40位小寫字符串)
#   - 如果您的系統有 `sha1sum`
if command -v sha1sum &> /dev/null
then
    SIG=$(echo -n "$STRING_TO_SIGN" | sha1sum | awk '{print $1}')
#   - 如果您的系統有 `openssl`
elif command -v openssl &> /dev/null
then
    SIG=$(echo -n "$STRING_TO_SIGN" | openssl sha1 -r | awk '{print $1}')
else
    echo "錯誤: 找不到 'sha1sum' 或 'openssl' 指令來產生簽名。"
    exit 1
fi

# API 請求 URL
URL="https://api.jp.feieyun.com/Api/Open/"

# --- 輸出調試資訊 (可選) ---
echo "正在查詢設備[${SN}]的詳細資訊..."
echo "使用接口: $APINAME"
echo "--------------------------"

# 5. 執行 curl 指令，並透過 jq 美化及轉碼輸出
curl -s -X POST "$URL" \
     -d "user=${USER}" \
     -d "stime=${STIME}" \
     -d "sig=${SIG}" \
     -d "apiname=${APINAME}" \
     -d "sn=${SN}" | jq

# 加上換行符以便於閱讀輸出
echo ""