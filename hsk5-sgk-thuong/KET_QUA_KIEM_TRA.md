# KIỂM TRA BỘ HSK5 SGK THƯỢNG WEB READY

**Phạm vi:** 18 bài SGK Thượng, 19 MP3, 19 timeline TXT, 100 khổ nghe.

**Kết quả kiểm tra dữ liệu:**
- 18/18 HTML có `lessonData` và `sl-listen-map` hợp lệ.
- 19/19 MP3 có thể đọc bằng ffprobe; không có mốc nào kết thúc sau thời lượng âm thanh.
- 19/19 timeline TXT đúng số mốc và số giây đã nhúng trong HTML.
- 100/100 khổ có transcript tiếng Trung khớp timeline theo toàn bộ thứ tự chữ Hán (đã lược dấu câu để so sánh).
- 19/19 file MP3 trong bản bàn giao có SHA-256 trùng file gốc. Không nén lại MP3.
- Bài 07 có 2 MP3, 3 khổ/MP3. Giữ nguyên 2 nguồn và logic chuyển track.
- Mã HTML gốc, CSS, lessonData, vocabulary, giao diện ba chế độ được giữ nguyên; sửa cơ chế nạp audio trên web, nhãn khổ/bài bị ghi cứng từ Bài 1, và văn bản hướng dẫn để người học không phải tải MP3.
- Kiểm thử Chromium với HTML và phản hồi HTTP MP3 mô phỏng: phát được Bài 01 (khổ 1, 7), Bài 07 (khổ 3 → 4 → 5, đổi đúng 2 file MP3), Bài 18 (khổ 1); transcript và chuyển về bài khóa hoạt động, không có lỗi JS. Đây là mô phỏng HTTP với tệp gốc, không thay thế kiểm thử trên website đích.

| Bài | Track | Số khổ | Trang HTML |
|---|---|---:|---|
| 01 | 01-1 | 7 | `HSK5_SGK_Thuong_Bai_01_NgheChep_PhongCach_SBT.html` |
| 02 | 02-1 | 6 | `HSK5_SGK_Thuong_Bai_02_NgheChep_PhongCach_SBT.html` |
| 03 | 03-1 | 5 | `HSK5_SGK_Thuong_Bai_03_NgheChep_PhongCach_SBT.html` |
| 04 | 04-1 | 6 | `HSK5_SGK_Thuong_Bai_04_NgheChep_PhongCach_SBT.html` |
| 05 | 05-1 | 4 | `HSK5_SGK_Thuong_Bai_05_NgheChep_PhongCach_SBT.html` |
| 06 | 06-1 | 6 | `HSK5_SGK_Thuong_Bai_06_NgheChep_PhongCach_SBT.html` |
| 07 | 07-1, 07-3 | 6 | `HSK5_SGK_Thuong_Bai_07_NgheChep_PhongCach_SBT.html` |
| 08 | 08-1 | 10 | `HSK5_SGK_Thuong_Bai_08_NgheChep_PhongCach_SBT.html` |
| 09 | 09-1 | 4 | `HSK5_SGK_Thuong_Bai_09_NgheChep_PhongCach_SBT.html` |
| 10 | 10-1 | 6 | `HSK5_SGK_Thuong_Bai_10_NgheChep_PhongCach_SBT.html` |
| 11 | 11-1 | 5 | `HSK5_SGK_Thuong_Bai_11_NgheChep_PhongCach_SBT.html` |
| 12 | 12-1 | 6 | `HSK5_SGK_Thuong_Bai_12_NgheChep_PhongCach_SBT.html` |
| 13 | 13-1 | 4 | `HSK5_SGK_Thuong_Bai_13_NgheChep_PhongCach_SBT.html` |
| 14 | 14-1 | 3 | `HSK5_SGK_Thuong_Bai_14_NgheChep_PhongCach_SBT.html` |
| 15 | 15-1 | 7 | `HSK5_SGK_Thuong_Bai_15_NgheChep_PhongCach_SBT.html` |
| 16 | 16-1 | 4 | `HSK5_SGK_Thuong_Bai_16_NgheChep_PhongCach_SBT.html` |
| 17 | 17-1 | 5 | `HSK5_SGK_Thuong_Bai_17_NgheChep_PhongCach_SBT.html` |
| 18 | 18-1 | 6 | `HSK5_SGK_Thuong_Bai_18_NgheChep_PhongCach_SBT.html` |

**Đã kiểm chứng:** cấu trúc, đối chiếu văn bản với TXT, đối chiếu timestamp, thời lượng MP3, tính nguyên gốc MP3 và liên kết tương đối. **Chưa được kết luận chỉ từ kiểm tra tĩnh:** âm thanh đã phát thành công trên đúng hosting thực tế, tương thích mọi trình duyệt và nghe đối chiếu giọng đọc bằng tai. Cần kiểm thử trực tiếp sau khi đăng.
