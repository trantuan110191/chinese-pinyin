# BÁO CÁO KIỂM TRA — HSK5 SGK Thượng

- Trang HTML: 18; MP3 nghe gốc: 19; TXT timeline: 19; MP3 tải rút gọn: 19.
- Trong toàn bộ 36 trang, 289 khối JavaScript đã được kiểm tra cú pháp và không báo lỗi. Các lần mở bằng Chromium mô phỏng đạt 36/36.
- Kiểm tra MP3 bằng ffprobe: 110/110 file đủ metadata, thời lượng rút gọn khớp bảng manifest ở mức ±1,5 giây.
- Đủ 19/19 liên kết tải trong menu ⋯; SHA-256 tệp tải trùng với data/mp3_theo_timeline.json.
- Các trang được kiểm thử tương tác: Bài 1, 7, 18 của SGK và Bài 1, 7, 18 của SBT; lặp play/pause, chuyển đoạn, phát lại bằng Option, mũi tên, chép chữ, màn hình nhỏ.
- Thước đo mô phỏng: tiến trình đổi 35 giá trị trong 0,7 giây lấy mẫu tại sáu bài; đợi mạng có thể ảnh hưởng thời gian bắt đầu phát nhưng không làm giảm nhịp khung hình sau khi đã có dữ liệu.
- SBT Bài 1 đã sửa nút mở nghe chép tránh bị thanh điều hướng che trên mobile.
- Dung lượng HTML của 18 bài SGK: khoảng 1.09 MB khi gzip cấp cao, bản trên đĩa lớn hơn; máy chủ cần bật nén văn bản.
- Giới hạn xác minh: không thể test HTTP/CDN/hosting đích do giới hạn môi trường browser, vì vậy cần xác nhận thao tác thực tế trên website sau khi đăng. Không được quảng cáo đã kiểm thử network production.
