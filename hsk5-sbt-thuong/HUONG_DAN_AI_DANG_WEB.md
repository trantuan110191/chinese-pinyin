# HSK5 SBT Thượng — gói triển khai web tự động (18 bài, 3 chế độ)

**Chỉ dẫn triển khai: ĐỪNG BIÊN TẬP LẠI HTML, KHÔNG IMPORT MP3/TIMELINE THỦ CÔNG.**

1. Giải nén ZIP, upload **toàn bộ nội dung bên trong** thư mục `HSK5_SBT_THUONG_WEB_READY/` lên **cùng một thư mục tĩnh public** trên hosting/web server (hoặc subfolder `/hsk5-sbt-thuong/`). Tránh upload chính file ZIP rồi gắn link đến ZIP; phải giải nén thành các tệp tĩnh.
2. URL mở đầu là `index.html` (tự chuyển đến `MUC_LUC.html`), cũng có thể liên kết thẳng `MUC_LUC.html`.
3. Mỗi file `HSK5_SBT_Thuong_Bai_XX_V18.html` lấy **đúng hai file MP3 qua URL tương đối** `audio/XX-01.mp3`, `audio/XX-02.mp3`. Các mốc nghe 14 câu được **gắn sẵn trong chính HTML**, nên **không cần import timeline**, không cần JSON API, database, plugin, Python, framework, build pipeline hoặc internet của dịch vụ thứ ba.
4. Dùng web server có hỗ trợ HTML5 audio, đúng `Content-Type: audio/mpeg`, **HTTP Range requests** (để nghe/tua nhanh), gzip hoặc Brotli cho `.html` và `.json`. Giữ nguyên tên đường dẫn và chữ hoa/thường. Không làm mất các thẻ `script`, `style`, hoặc `id` trong HTML.
5. Nếu dùng WordPress hoặc CMS, **không dán HTML trực tiếp vào trình biên tập nội dung** (có thể lọc script). Phải upload bộ tệp tĩnh và liên kết tới URL của chúng, hoặc nhúng trang qua iframe nếu chính sách cho phép.
6. Test sau upload: mở `index.html`, chuyển sang Bài 01, bật nghe câu 1 rồi câu 7, kiểm tra không 404; thử Bài 18 câu 14, thử 3 chế độ Sáng/Chạng vạng/Đêm. Cần tương tác trực tiếp để phát âm thanh vì trình duyệt chặn tự phát không có thao tác người dùng.
7. `data/manifest.json` ghi đầy đủ 18 bài, 36 audio, 252 mốc, checksum SHA-256 và nội dung từng câu; `timeline/` giữ nguyên 36 timeline nguồn để đối chiếu/hậu kiểm, **không bắt HTML tải các file TXT**.

**Quan trọng — không sửa câu hỏi hay thời gian trên website.** Các cue của câu 12 và 14 mỗi bài thường là câu hỏi thứ hai của một đoạn thoại chung, đúng theo timeline gốc. Khi bấm riêng những câu đó, bản nghe sẽ phát đoạn câu hỏi tương ứng, không lặp cả đoạn nói; người học có thể nghe lại câu trước để nghe cả ngữ cảnh. Không tự kéo dài mốc hoặc đảo thứ tự.

**Cấu trúc**

```
index.html
MUC_LUC.html
HSK5_SBT_Thuong_Bai_01_V18.html
...
HSK5_SBT_Thuong_Bai_18_V18.html
audio/01-01.mp3 ... audio/18-02.mp3
timeline/01-01.txt ... timeline/18-02.txt
data/manifest.json
HUONG_DAN_AI_DANG_WEB.md
KET_QUA_KIEM_TRA.md
```

**Hiệu năng:** Chỉ tải HTML của bài được mở; MP3 lưu ngoài HTML, không nhúng base64, không gọi download toàn bộ 36 bài, `preload=none`, một phần tử `<audio>` phát file theo nhu cầu, tệp MP3 gốc không mã hóa lại. Hosting nên bật cache phù hợp cho file âm thanh. **Không** ép preload toàn bộ audio hay gộp các 36 audio thành một tệp lớn.
