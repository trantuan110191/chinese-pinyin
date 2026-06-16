# Nguồn dữ liệu học tập

## `hsk-vocabulary.json`

- 988 mục từ thuộc ba cấp đầu của New HSK 3.0: 300 từ HSK 1, 197 từ HSK 2 và 491 từ HSK 3.
- Danh sách cấp độ lấy từ gói `hanzi-voice-dictionary-v0.8.0.rar` do người dùng cung cấp.
- New HSK 3.0 được công bố tháng 11/2025 và có hiệu lực từ tháng 7/2026.
- Pinyin được đối chiếu bằng CC-CEDICT và xử lý ngữ cảnh bằng `pinyin-pro`; các từ có âm nhẹ và biến điệu thông dụng đã được rà soát riêng.
- Nghĩa Việt phổ biến được biên tập thủ công. Các mục còn lại được hỗ trợ dịch từ định nghĩa CC-CEDICT và cần tiếp tục được rà soát khi đưa vào bài học chuyên sâu.
- CC-CEDICT được phát hành theo giấy phép CC BY-SA 4.0.
- Mỗi mục trỏ tới một file MP3 trong `audio/hsk1`, `audio/hsk2` hoặc `audio/hsk3`. Bộ âm hiện tại dùng giọng `zh-CN-XiaoxiaoNeural`, tốc độ nguồn `-5%`.

## `common-sentences.json`

- 80 câu giao tiếp cơ bản theo 8 chủ đề.
- Mỗi câu có chữ Hán, Pinyin và nghĩa tiếng Việt.
- Pinyin câu được rà soát thủ công để giữ đúng âm nhẹ, biến điệu và cách ngắt tự nhiên.

Kho 988 từ phục vụ tra nhanh. Phần nguồn gốc chữ và mẹo hình tượng chỉ được thêm vào khu phân tích chuyên sâu sau khi đã kiểm chứng.
