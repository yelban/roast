#!/bin/bash

# --- 載入環境變數 ---
if [ ! -f ../.env ]; then
    echo "錯誤：找不到 .env 檔案。"
    echo "請在對應目錄下建立一個 .env 檔案，並填入 USER, UKEY, 和 SN。"
    exit 1
fi
source ../.env
if [ -z "$USER" ] || [ -z "$UKEY" ] || [ -z "$SN" ]; then
    echo "錯誤：請確保 .env 檔案中已正確設定 USER, UKEY, 和 SN 變數。"
    exit 1
fi
# ---------------------------------

# 1. 設定 API 參數
#    使用小票機的列印接口 Open_printMsg
APINAME="Open_printMsg"
URL="https://api.jp.feieyun.com/Api/Open/"

# 2. 構造排版內容
#    使用 <CB> 置中放大, <BR> 換行等指令
#    註：對齊是透過手動增減空格來完成的，您可能需要微調以達到最佳效果
ORDER_TIME=$(date '+%Y-%m-%d %H:%M:%S')

# 使用 heredoc 格式化多行內容
read -r -d '' CONTENT << EOM
<CB>スタミナ苑</CB>
名称                 単価      数量        金額
------------------------------------------------
上ロース            3,100       1       3,100
上ミノ              1,700       2       3,400
わかめクッパ（半分）  650       1         650
------------------------------------------------<BR>
<RIGHT>小計  ￥11,650
消費税（10%）  ￥117
合計（税込）  ￥11,767<BR>

注文時間：${ORDER_TIME}</RIGHT>
EOM


# 3. 獲取當前 UNIX 時間戳
STIME=$(date +%s)

# 4. 產生簽名
STRING_TO_SIGN="${USER}${UKEY}${STIME}"
if command -v sha1sum &> /dev/null; then
    SIG=$(echo -n "$STRING_TO_SIGN" | sha1sum | awk '{print $1}')
elif command -v openssl &> /dev/null; then
    SIG=$(echo -n "$STRING_TO_SIGN" | openssl sha1 -r | awk '{print $1}')
else
    echo "錯誤: 找不到 'sha1sum' 或 'openssl' 指令。"
    exit 1
fi

# --- 輸出調試資訊 (可選) ---
echo "🖨️  正在傳送訂單到收據機 [${SN}]..."
echo "-------------------------------------"

# 5. 執行 curl 指令，並透過 jq 美化輸出
curl -s -X POST "$URL" \
     -d "user=${USER}" \
     -d "stime=${STIME}" \
     -d "sig=${SIG}" \
     -d "apiname=${APINAME}" \
     -d "sn=${SN}" \
     --data-urlencode "content=${CONTENT}" | jq