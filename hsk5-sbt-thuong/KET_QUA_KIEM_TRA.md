# KẾT QUẢ ĐỐI CHIẾU — HSK5 SBT THƯỢNG (bản WEB READY)

**Phạm vi kiểm tra:** 18 HTML, 36 MP3, 36 timeline gốc và 252 mốc cho 252 câu nghe.

- Đường dẫn tên bài / tên MP3 / timeline: **đúng từng bài, từng phần**, không thiếu file.
- Cấu trúc câu nghe: **6 mốc MP3 01 + 8 mốc MP3 02** cho mỗi bài.
- Timeline TXT: đọc được đủ 252 mốc; mốc bắt đầu nhỏ hơn kết thúc, sắp đúng thứ tự, không chồng lấn và nằm trong thời lượng MP3.
- Văn bản Hán trong timeline và phần transcript HTML: **đối chiếu ký tự Hán và số trùng khớp** khi mỗi mốc có đầy đủ lời thoại. Tổng cộng **216/252** mốc chứa đủ lời thoại và câu hỏi, khớp sau chuẩn hóa dấu/khoảng cách. **36/252** mốc còn lại (câu 12 và 14 ở mỗi bài) là câu hỏi thứ hai của một đoạn thoại dùng chung, và **khớp phần câu hỏi** trong HTML. Không phải thiếu audio.
- Thông tin audio kiểm qua metadata MP3 (thời lượng, bitrate): file nguyên bản 128 kbps; giữ nguyên byte.
- Các HTML đã được gắn URL MP3 trực tiếp và mốc ngay trong JavaScript, không cần thao tác import thủ công. Đường dẫn tương đối đã được làm ngắn để tránh lỗi ký tự Unicode trong URL.

## Kết quả từng bài

| Bài | Số mốc MP3 01 / 02 | Đối chiếu câu hỏi | Mốc trong MP3 |
|---|---:|---|---|
| 01 | 6 + 8 = 14 | OK | OK |
| 02 | 6 + 8 = 14 | OK | OK |
| 03 | 6 + 8 = 14 | OK | OK |
| 04 | 6 + 8 = 14 | OK | OK |
| 05 | 6 + 8 = 14 | OK | OK |
| 06 | 6 + 8 = 14 | OK | OK |
| 07 | 6 + 8 = 14 | OK | OK |
| 08 | 6 + 8 = 14 | OK | OK |
| 09 | 6 + 8 = 14 | OK | OK |
| 10 | 6 + 8 = 14 | OK | OK |
| 11 | 6 + 8 = 14 | OK | OK |
| 12 | 6 + 8 = 14 | OK | OK |
| 13 | 6 + 8 = 14 | OK | OK |
| 14 | 6 + 8 = 14 | OK | OK |
| 15 | 6 + 8 = 14 | OK | OK |
| 16 | 6 + 8 = 14 | OK | OK |
| 17 | 6 + 8 = 14 | OK | OK |
| 18 | 6 + 8 = 14 | OK | OK |

## Giới hạn của việc đối chiếu

Đã kiểm cấu trúc nhị phân, thông số và độ dài MP3, so khớp văn bản Hán ở timeline với transcript HTML. **Chưa thực hiện đối chiếu nghe thủ công từng đoạn audio** hay kiểm thử phát âm thanh trên thiết bị/trình duyệt thực tế. Do đó không tuyên bố đã xác nhận từng âm tiết trong ghi âm bằng tai. Ngay khi website được deploy, nên kiểm tra thử phát và tua (HTTP Range) trên hosting đích.

**Lưu ý:** Câu 12 và câu 14 được khởi tạo đúng mốc câu hỏi trong timeline; người dùng muốn nghe phần nội dung chung nên mở câu liền trước.
