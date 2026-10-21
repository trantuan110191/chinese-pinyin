# HSK5 SGK Thượng — BẢN DUY NHẤT DÙNG ĐĂNG WEB (21-10-2026)

**Nguồn triển khai:** dùng ZIP này, không tìm và không kết hợp tệp từ các bản cũ. Toàn bộ file kèm theo đã chuẩn bị đường dẫn tương đối.

## 1. Thành phần chính xác
- 18 tệp `HSK5_SGK_Thuong_Bai_*.html` (giữ tên hiện có); trang `index.html`, `MUC_LUC.html`.
- `audio/`: 19 MP3 nguyên gốc để nghe theo timeline, không tái mã hóa; `timeline/`: 19 TXT đúng cặp.
- `download/`: 19 MP3 đã cắt–ghép theo timeline (một timeline = một file tải), không dùng thay MP3 gốc khi phát trên web.
- `data/manifest.json`, `data/mp3_theo_timeline.json`, `data/checksums.json`: sơ đồ và mã đối chiếu.
- Bài 1 của SBT có nghe chép tùy chọn cho bài đọc dài câu 23–25 (8 khổ) và 26–28 (3 khổ), CHƯA có audio/timeline đọc dài riêng; không gán nhầm âm thanh trắc nghiệm.

## 2. Đăng website MỚI, xóa sạch website cũ theo yêu cầu của chủ sở hữu
1. Xác nhận đã xác định được **đúng webroot/website đích** mà chủ sở hữu muốn xóa sạch. Người dùng chỉ định **không sao lưu**; không tự động sao lưu dưới tên khác.
2. Chỉ xóa dữ liệu thuộc đúng website đích sau khi xác định phạm vi. **Không xóa DNS, SSL, hosting account, cơ sở dữ liệu ngoài website, hoặc tài nguyên dùng chung với website khác.**
3. Giải nén ZIP SGK vào `<webroot>/SGK_Thuong/` và ZIP SBT vào `<webroot>/SBT_Thuong/` (phải là HAI thư mục tách biệt); không giải nén trực tiếp cả hai vào một thư mục vì trùng `index.html`, `audio/`, `download/`, `timeline/`.
4. Tạo trang chủ chung ở `<webroot>/index.html` liên kết tương đối đến `SGK_Thuong/index.html` và `SBT_Thuong/index.html`. Khi dùng gói gộp website, trang chủ đã có sẵn.
5. Giữ nguyên nội dung HTML và tên các file bài; KHÔNG tự viết lại chức năng, thay nguồn nghe hoặc rút gọn timeline.
6. Hosting cần trả `audio/mpeg` cho MP3 và hỗ trợ byte-range (`206 Partial Content`, `Content-Range`, `Accept-Ranges: bytes`) để tua nhanh; ưu tiên HTTP/2 hoặc HTTP/3 khi khả dụng.
7. Cấu hình Brotli/Gzip cho HTML/JS/CSS/JSON/TXT khi hosting hỗ trợ. MP3 đã nén nên không gzip lại. Tải MP3 theo yêu cầu của từng bài, không preload cả hai bộ.
8. HTML phải được làm mới cache sau triển khai; giữ phiên bản hiện hành của tài nguyên theo URL. Chỉ xóa file thừa bên trong đúng webroot đích.

## 3. Kiểm tra chức năng bắt buộc sau đăng
- Trên tất cả 18 bài: giao diện ba chế độ; câu hỏi, đáp án, transcript; kéo chia khung và cuộn độc lập tại nơi có tính năng.
- Mở trang không tải đồng loạt MP3; khi nhấn ▶ lấy đúng `audio/...`, khi chuyển câu/khổ không còn tiếng đoạn cũ, Phát/Tạm dừng đổi biểu tượng ngay; khi phát dấu tròn trượt liên tục theo `requestAnimationFrame`, tua bằng tay chính xác, không nhảy thành từng nấc.
- Phím Option (macOS) hoặc Alt (Windows) **nhấn-thả một mình**: phát lại câu/khổ hiện tại; phím ←/→: câu/khổ trước/sau ở chế độ nghe. Không chiếm phím khi đang gõ vào ô nhập hoặc đang kéo thanh tua, thanh chia cột.
- Phát/dừng liên tiếp, chuyển ngay sang câu mới trong khi file đang tải, tua, lặp, dừng, đi câu cuối; thử cả khi mạng chậm. Các lệnh phát cũ không được ghi đè trạng thái câu mới.
- Nút tải MP3 đặt trong menu **⋯** tại đúng thanh nghe: 19 liên kết tải MP3 theo timeline, kiểm tra trình duyệt tải đúng file. SGK Bài 7 phải tải được cả `07-1` và `07-3` riêng.
- Bản SGK: nút Hiện/Ẩn tất cả đáp án bám theo khung bài tập khi cuộn. Bản SBT Bài 1: nút nghe chép đọc dài không bị topbar che trên điện thoại; 8 khổ và 3 khổ, kéo khung và quay về trắc nghiệm.
- Kiểm thử trên desktop + điện thoại, các chế độ ngày/hoàng hôn/đêm; mở trang bằng HTTPS chính thức, kiểm tra Network, console, range 206, link tải và cache.

## 4. Điều đã được kiểm tra trước khi đóng ZIP
- 36/36 HTML của hai bộ khởi tạo được trong Chromium mô phỏng, 289 đoạn JavaScript kiểm tra cú pháp không lỗi.
- 110 file MP3 gồm 55 gốc + 55 rút gọn có metadata hợp lệ; 55 nút tải có file thật và SHA-256 khớp với dữ liệu tải.
- Kiểm thử chuyển động giả lập sáu bài đại diện: 35 vị trí khác nhau trong 0,7 giây; nút play phản hồi ngay, rapid play/pause và chuyển đoạn không lỗi trên kích thước desktop/mobile.
- Bản SBT Bài 1: click thật nút nghe chép trên mobile, kéo chia khung, chuyển khổ, quay lại đã kiểm tra.
- **Giới hạn:** Browser kiểm thử không thể truy cập HTTP/file URL do chính sách môi trường; không xác nhận được bitrate/độ trễ mạng CDN thực, HTTP byte-range trên hosting đích hoặc hành vi tải của hệ điều hành người dùng. AI triển khai phải kiểm tra sau khi đăng và báo trung thực.

## 5. Bàn giao
Sau khi kiểm thử hoàn tất, báo URL website, URL SGK/SBT và kết quả kiểm tra. Chỉ hỏi người dùng nếu chưa xác định được đúng website/webroot để xóa hoặc gặp rủi ro liên quan đến tài nguyên ngoài phạm vi đó.
