# HUONG DAN AI TRIỂN KHAI — HSK5 SGK THƯỢNG + SBT THƯỢNG

ĐÂY LÀ ZIP DUY NHẤT TRIỂN KHAI WEBSITE MỚI. KHÔNG cần hai ZIP riêng, không nhập dữ liệu từ các bản cũ.

## 1. Gói có sẵn
- index.html: trang chủ mở hai bộ sách.
- SGK_Thuong/: 18 bài HTML, 19 MP3 gốc, 19 file timeline, 19 MP3 tải về đã cắt/ghép.
- SBT_Thuong/: 18 bài HTML, 36 MP3 gốc, 36 file timeline, 36 MP3 tải về đã cắt/ghép.
- 00_AI_BAT_DAU_TAI_DAY.md và 01_BAO_CAO_KIEM_TRA.md trong mỗi thư mục sách.
- Các tệp data/manifest.json, data/checksums.json và hướng dẫn liên quan.

## 2. Thực hiện thay thế hoàn toàn
1. Xác định CHẮC CHẮN domain/hosting và thư mục webroot chính xác của WEBSITE MÀ NGƯỜI DÙNG MUỐN XÓA. Nếu chưa đủ quyền hoặc chưa biết webroot nào, chỉ hỏi thông tin này; KHÔNG đoán.
2. Người dùng yêu cầu XÓA SẠCH website cũ, KHÔNG SAO LƯU, KHÔNG giữ phiên bản cũ. Chỉ xóa đúng tài nguyên thuộc webroot được chỉ định. Không xóa tên miền, DNS, chứng chỉ SSL, tài khoản hosting, dữ liệu hoặc website dùng chung ngoài phạm vi webroot.
3. Giải nén TOÀN BỘ NỘI DUNG của ZIP này trực tiếp vào webroot. Root của website phải có index.html, SGK_Thuong/ và SBT_Thuong/. KHÔNG để thêm thư mục bọc ngoài, KHÔNG tải hai ZIP riêng vào root.
4. Giữ nguyên tên file, cấu trúc thư mục, HTML, MP3, timeline, đáp án, các chức năng và đường dẫn tương đối; không tự viết lại hoặc tạo lại các tệp nghe.
5. Website nên dùng HTTPS và hỗ trợ HTTP byte-range cho MP3 (206 Partial Content, Accept-Ranges: bytes, Content-Range), đúng MIME audio/mpeg. Bật Brotli/Gzip cho HTML, JS, CSS, JSON, TXT khi có thể, không nén lại MP3 ở HTTP. Chỉ tải âm thanh theo nhu cầu, tránh preload hàng loạt. Xử lý cache/CDN nếu có.

## 3. KIỂM TRA BẮT BUỘC SAU KHI ĐĂNG
- Trang chủ liên kết đúng SGK_Thuong/index.html và SBT_Thuong/index.html, đủ 18+18 bài.
- 55 MP3 phát trực tuyến lấy đúng 55 timeline; 55 file download rút gọn tải đúng trong menu dấu ba chấm (⋯). SGK Bài 7 có hai file nguồn tương ứng.
- Phát / Tạm dừng đổi biểu tượng nhanh; đổi câu không phát tiếng cũ; tua, lặp và dấu tròn thanh tiến trình chạy mượt; kiểm tra cả thao tác liên tiếp rất nhanh và mạng chậm.
- Mac Option (nhấn rồi thả một mình) phát lại câu/khổ, mũi tên trái/phải chuyển câu/khổ; không chiếm phím khi đang nhập văn bản, di chuyển con trỏ, kéo tua hoặc kéo chia cột.
- Ba chế độ màu, transcript, nghe chép, ô nhập, kiểm tra phần chép, câu hỏi/đáp án A/B/C/D, nút Hiện/Ẩn đáp án bám khi cuộn, cuộn độc lập và kéo chia cột khi có tính năng.
- Riêng SBT Bài 1: đọc hiểu câu 23–25 và 26–28 giữ làm chế độ mặc định, nghe chép là chế độ tùy chọn; 8 khổ và 3 khổ, chưa có audio/timeline riêng cho phần đọc dài nên KHÔNG gán nhầm MP3 trắc nghiệm.
- Kiểm tra trên máy tính và điện thoại, Chrome và Safari/macOS nếu có thể; mở console và network kiểm tra 404, MIME, HTTP Range 206, lỗi JavaScript và cache.

## 4. NGUYÊN TẮC BÀN GIAO
- Không tuyên bố đã kiểm thử trên hosting nếu chưa trực tiếp làm được; nêu rõ lỗi và giới hạn nếu có.
- Chỉ hỏi người dùng khi webroot chưa xác định, thiếu quyền truy cập hoặc thao tác có thể ảnh hưởng dữ liệu NGOÀI webroot.
- Sau khi triển khai, gửi URL trang chủ + URL hai bộ sách, tình trạng 36 bài, kết quả kiểm thử âm thanh và tải xuống.
