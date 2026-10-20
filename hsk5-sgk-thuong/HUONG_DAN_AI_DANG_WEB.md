# HSK5 SGK THƯỢNG — 18 BÀI — HƯỚNG DẪN TRIỂN KHAI TỰ ĐỘNG

## Bước triển khai (KHÔNG CẦN GHÉP AUDIO / TIMELINE)

1. Giải nén đúng toàn bộ ZIP vào cùng MỘT thư mục trên website, ví dụ `public/hsk5/sgk-thuong/`. Không thay đổi tên các tệp HTML, MP3, TXT.
2. Duy trì cấu trúc: `index.html`, `MUC_LUC.html`, 18 HTML cùng cấp; thư mục `audio/` có 19 MP3; `timeline/` có 19 TXT; `data/manifest.json` là dữ liệu kiểm tra.
3. Thiết lập máy chủ cho các tệp `.html` trả `text/html; charset=utf-8`, `.mp3` trả `audio/mpeg`, `.txt` trả `text/plain; charset=utf-8`, `.json` trả `application/json`. Máy chủ cần chấp nhận HTTP Range cho MP3 để tua đến từng khổ.
4. Không chép thủ công vào trình soạn thảo bài viết có cơ chế lọc `<script>`; cách đăng khuyến nghị là phục vụ nguyên tệp HTML (static hosting hoặc static directory), rồi tạo liên kết đến `index.html` từ menu website.
5. Không chép MP3 vào HTML, không nhập MP3 thủ công, không nhập lại timeline; tất cả đường dẫn âm thanh dùng đường dẫn tương đối `audio/xx-1.mp3` hoặc `audio/07-3.mp3`.
6. Không sửa HTML/cấu trúc chương trình, không đảo thứ tự bài, không đổi tên file, không thiết kế lại giao diện. Giữ đầy đủ chế độ Bài khóa/Từ mới, Ngữ pháp/Bài tập, Nghe–chép và các giao diện Sáng/Chạng vạng/Đêm.
7. Bài 07 có **hai MP3** `audio/07-1.mp3` và `audio/07-3.mp3` (các khổ 1–3 và 4–6). Không ghép hai MP3 với nhau và không sửa mốc.
8. Chỉ cần mở `index.html` (hoặc `MUC_LUC.html`) là đi tới đủ 18 bài. Mỗi trang chỉ tải audio khi nhấn phát, không tải sẵn toàn bộ MP3.

## Kiểm tra vận hành SAU khi đăng

- Mở `index.html`, chọn Bài 01, thử phát khổ 1 và khổ cuối, thử tua, tạm dừng, hiện/ẩn transcript, quay về Bài khóa, chuyển Ngữ pháp.
- Mở Bài 07, thử khổ 3 rồi khổ 4 để xác nhận trình nghe tự đổi `07-1.mp3` → `07-3.mp3`.
- Mở Bài 18, thử phát một khổ bất kỳ; kiểm tra DevTools Network không có `404` hoặc `403` cho MP3.
- Kiểm tra mobile Safari/Chrome nếu website phục vụ thiết bị di động. Trên một số thiết bị, autoplay không được phép; người học phải bấm ▶.

## Tối ưu hiệu năng

- HTML là độc lập từng bài, không phụ thuộc thư viện ngoài; không đổi giao diện đã biên tập.
- MP3 giữ nguyên nội dung và bitstream để tránh lệch timeline; tối ưu bằng tải theo nhu cầu, HTTP range, và cache phía máy chủ (khuyên tối đa 1 ngày với đường dẫn cố định để tránh lưu bản cũ).
- Bật Brotli/Gzip cho `.html`, `.txt`, `.json`. Không cần nén gzip MP3 vì đã nén âm thanh.
- Không tải tất cả MP3 vào một trang và không gộp thành một file MP3 lớn.
- Timeline đã nhúng đúng 100 đoạn trong HTML; `timeline/` là bản lưu nguồn/đối chiếu chứ không phải tệp phải tải khi mở trang.

## Các tệp chẩn đoán

`data/manifest.json` chứa tên file, track, mốc nghe, SHA-256, số khổ, thời lượng. `KET_QUA_KIEM_TRA.md` ghi chi tiết kiểm tra trước bàn giao.
