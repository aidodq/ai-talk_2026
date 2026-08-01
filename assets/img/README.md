# Ảnh trong trang

Tất cả ảnh dưới đây đã có sẵn, lấy từ `uploads/` của project Claude Design
`AI & Software Engineering Event` rồi resize + nén lại cho web (Pillow, JPEG
progressive, đã strip EXIF).

| File                | Nguồn trong `uploads/`                              | Kích thước    | Dung lượng |
| ------------------- | ---------------------------------------------------- | ------------- | ---------- |
| `hero.jpg`          | `IMG_7295-cca79c40.jpg`                              | 1800 × 1350   | ~503 KB    |
| `venue-hall.jpg`    | `IMG_7580.jpg`                                       | 1500 × 1125   | ~380 KB    |
| `venue-deck.jpg`    | `TANZ8325 (1)-1fb29581.jpg`                          | 1100 × 772    | ~148 KB    |
| `venue-lotus.jpg`   | `IMG_7575.jpg`                                       | 1100 × 825    | ~241 KB    |
| `venue-detail.jpg`  | `39310E1C-828E-445D-B083-82122B40E05C_1_105_c.jpeg`  | 1024 × 768    | ~251 KB    |
| `venue-evening.jpg` | `IMG_7295-cca79c40.jpg` (bản nhẹ hơn)                | 1200 × 900    | ~287 KB    |
| `speaker-aido.jpg`  | `Gemini_Generated_Image_413wxq413wxq413w.png`        | 900 × 1125    | ~212 KB    |
| `og-cover.jpg`      | crop 16:9 từ hero                                    | 1200 × 630    | ~226 KB    |
| `qr-form.png`       | `qrcode_savemoney.png`                               | 440 × 440     | ~26 KB     |

Tổng ~2.2 MB. Ảnh gốc nặng 4–11 MB mỗi tấm nên **không dùng trực tiếp**.

`qr-form.png` đã được flatten lên nền trắng (bản gốc là PNG có alpha — để nguyên
thì trên nền navy của phần Đăng ký sẽ thành đen-trên-đen, quét không ra). QR trỏ
tới `https://q.me-qr.com/uh4dqj80` → Google Form đăng ký.

`speaker-aido.jpg` đã cắt bỏ dải chữ viết tay "AIDo" ở đáy tranh cho vừa khung
4:5 — tên diễn giả đã hiển thị bằng chữ lớn ngay bên cạnh nên không cần lặp.

## QR trên thẻ tên

| File | Dùng ở đâu | Kích thước | Version | Module |
| ---- | ---------- | ---------- | ------- | ------ |
| `qr-event.png`   | ô QR trên thẻ tên (`checkin.html`, `nametag.html`) | 555 × 555 | 8 | 49 × 49 |
| `qr-form.png`    | phần Đăng ký của `index.html`                      | 440 × 440 | — | — |
| `qr-fanpage.png` | **không còn dùng** — QR Fanpage cũ, giữ lại phòng khi cần | 153 × 153 | 4 | 36 × 36 |

Ô QR trên thẻ rộng 72 đơn vị lưới = 19,2 mm khi in. Con số này bám theo số
module của `qr-event.png`: 49 module trong vùng mã 17,6 mm → **0,36 mm mỗi
module**. Ở 59 đơn vị như thiết kế gốc thì chỉ còn 0,289 mm — dưới ngưỡng máy
ảnh điện thoại đọc ổn định, và mực laser trên giấy kraft sẽ nhoè dính các
module vào nhau.

**Nếu đổi QR khác thì phải kiểm lại con số này.** QR càng nhiều dữ liệu thì
version càng cao, module càng nhỏ. Đếm module rồi tính:
`(72 × 0,267241 mm − 1,6 mm padding) ÷ số module ≥ 0,35 mm`.

Thiếu file thì thẻ vẫn in được: ô QR hiện khung nét đứt chữ "QR" để dán mã bằng
tay. Thả đúng file vào là cả hai trang tự hiện, không cần sửa code.

## Tải lại ảnh gốc từ project Design

API `get_file` của MCP cắt file ở 256 KiB nên không lấy được ảnh gốc. Dùng
endpoint `serve` của canvas (token lấy từ tab network khi mở project trên
claude.ai):

```bash
B="https://<projectId>.claudeusercontent.com/v1/design/projects/<projectId>/serve/uploads"
curl -o out.jpg "$B/IMG_7295-cca79c40.jpg?t=<token>"
```

Token có hạn — hết hạn thì mở lại project trên claude.ai và lấy token mới.
