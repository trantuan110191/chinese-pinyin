#!/bin/zsh
cd "/Users/thuyanh/Desktop/Desktop Organized/Projects/chinese pinyin clarity" || exit 1
echo "Đang mở server tạo MP3 edge-tts..."
echo "Giữ cửa sổ Terminal này mở khi dùng trang Tạo MP3."
echo "Địa chỉ server: http://127.0.0.1:8788"
echo
node scripts/tts-server.mjs
