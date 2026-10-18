# HSK5 MP3 offline — kiểm tra ngày 19/10/2026

## Nội dung

- Giữ nguyên toàn bộ phần body và 3 script của HTML HSK5 V18: đã so sánh chính xác với nguồn.
- 32 câu; nghe 1–14, đọc/viết 15–32. Không thay đáp án, dẫn chứng hoặc lời giải.
- Dùng MP3 01-01 và 01-02 do người học cung cấp trong thư mục bài nghe.
- Timeline 1–6 lấy từ tin nhắn; 7–14 lấy từ file Pasted text.txt người học gửi tiếp.
- Giữ nguyên timestamp, Pinyin, Hán, Anh và Việt; không tự chỉnh lỗi hoặc dịch lại.
- Cần người học xác nhận ánh xạ trước khi sử dụng. Đoạn câu 11 được đề xuất dùng cho 11,12; đoạn câu 13 dùng cho 13,14. Các mốc hỏi riêng 12 và 14 được giữ nguyên.
- Mốc câu 8 (00:29–00:36) ngắn bất thường. Chưa xác minh nội dung âm thanh có khớp mốc này; không tự sửa.

## Đã kiểm thử tự động trên Google Chrome thật (headless)

- Có đủ 32 câu; timeline có 14 đoạn; đọc được thời lượng của cả 2 MP3 thật.
- Phát, tua và dừng ở cuối đoạn; chuyển sang file 01-02 ở câu 7.
- Transcript ẩn trước khi kiểm tra hoặc yêu cầu; chấm phần chép không mở đáp án ABCD.
- Chọn D của câu 1 mở popup gốc; lựa chọn và nội dung gõ còn sau khi reload ngay.
- Chuyển câu 15, 23, 29 giữ vùng đọc/viết gốc; không hiện khung MP3.
- Enter khi IME composing không chấm và không chuyển câu.
- So chép có chữ thừa không đạt 100%; hỗ trợ tùy chọn 三 / 3.
- ZIP chứa âm thanh, timeline, tiến độ; khôi phục thành bản riêng và phát được MP3.
- Tải lại khi offline và phát được MP3 đã lưu trong IndexedDB.
- Độ rộng desktop 1440, tablet 820 và mobile 390 không làm tràn ngang trang. Đã chụp và rà soát bố cục.

## Chưa nghiệm thu đầy đủ

- Chưa thử trên Safari iPad thật. Mô phỏng kích thước tablet trên Chrome không thay thế được kiểm tra này.
- Chưa nghe đối chiếu thủ công toàn bộ 14 đoạn, đặc biệt mốc ngắn câu 8.
- Chưa kiểm thử giới hạn dung lượng thực hoặc thu hồi dữ liệu của Safari.
- Chưa có HTML bài 2 trong bộ bàn giao này. Thư viện hiện tạo các bản luyện độc lập của Bài 1, không giả làm nội dung Bài 2.
- Chưa kiểm thử dữ liệu 100 câu: bản gốc có 32 câu. Không dựng sẵn kho bài ngoài nội dung được gửi.

## Sử dụng

Mở trang qua HTTPS hoặc localhost. Lần đầu cần kết nối để tải giao diện và hai MP3; các lần sau dùng offline trên cùng trình duyệt. Trong “Thư viện & mốc nghe”, kiểm tra số câu, file, mốc và bấm “Xác nhận & lưu các mốc”.

JSON chỉ có metadata/tiến độ, không chứa âm thanh; khi chuyển máy nên dùng ZIP kèm MP3. Các file người học nhập chỉ lưu cục bộ, không gửi lên máy chủ.
