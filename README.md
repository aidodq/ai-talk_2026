# AI & Software Engineering — Event Landing

Landing page cho talkshow **AI & Software Engineering — From Footprints to Startup Reality**
(SaveMoney × Duyên Quơ, 16:00–18:30 Chủ Nhật 02/08/2026, giới hạn 20 người).

Triển khai từ bản thiết kế `Event Landing.dc.html` trong project Claude Design
`AI & Software Engineering Event` (`8b056173-0fab-47f8-a7f4-6db1bcd2735b`).

## Chạy thử

Trang là HTML tĩnh, không cần build. Mở trực tiếp `index.html`, hoặc chạy một
server tĩnh để `fetch` / ảnh hoạt động đúng như khi deploy:

```bash
npx serve .          # hoặc: python -m http.server 8080
```

## Cấu trúc

```
index.html                 # toàn bộ nội dung + JSON-LD schema.org/Event
assets/css/styles.css      # design tokens, layout, responsive, print
assets/js/main.js          # nav mobile, scroll-spy, reveal, countdown, form
assets/img/                # ảnh — xem assets/img/README.md
```

## Từ bản thiết kế sang code

Bản `.dc.html` là template của Claude Design canvas (`<x-dc>` + `<helmet>`, render
qua `support.js`). Bản triển khai này bỏ runtime đó và giữ nguyên hệ thiết kế:

| Thiết kế | Triển khai |
| --- | --- |
| Style inline, cỡ chữ cố định (h1 78px, grid 3 cột) | CSS tokens + `clamp()`, grid đổ về 2 rồi 1 cột |
| Nav ngang cố định | Header sticky + drawer hamburger dưới 900px, scroll-spy `aria-current` |
| Các "pill" trình độ / mục tiêu / giờ-tuần là `<div>` | `<input type="radio">` / `checkbox` thật, ẩn trực quan nhưng focus được |
| Nút gửi là `<a href="#register">` | `<form>` thật nối vào Google Form: validate tiếng Việt, honeypot, trạng thái `aria-live` |
| Ảnh đặt bằng `background-image` | `<img>` có `alt`, `loading="lazy"`, fallback khi thiếu file |
| Không có meta | title/description, Open Graph, favicon, JSON-LD `Event` |

Palette, khoảng cách, bo góc, gradient và toàn bộ nội dung tiếng Việt giữ nguyên
1:1 so với thiết kế.

## Nhận hồ sơ đăng ký

Form trong trang **nối thẳng vào Google Form của BTC** (chính là form sau mã QR).
Người đăng ký điền và gửi ngay trên landing page, không phải rời trang.

Cách hoạt động: mỗi ô mang thuộc tính `data-entry` là id trường bên Google Form;
`main.js` gom chúng thành `entry.NNN=value` rồi `POST` urlencoded tới
`/formResponse`.

| Ô trong trang | Google Form | Bắt buộc |
| --- | --- | --- |
| `fullname` | `entry.1091294493` | ✓ |
| `phone` | `entry.1171956585` | ✓ |
| `email` | `entry.468909717` | ✓ |
| `org` | `entry.1530473906` | ✓ |
| `level` | `entry.1168402147` | ✓ |
| `aitools` | `entry.1369194237` | ✓ |
| `goals` | `entry.1430492862` | ✓ |
| `commitment` | `entry.1280455990` | — |

Hai điểm phải giữ đúng, nếu sai thì câu trả lời bị Google bỏ qua **mà không báo lỗi**:

1. `value` của mỗi pill phải trùng từng ký tự với đáp án bên Google Form. Nhãn
   hiển thị (trong `<span>`) thì ngắn gọn theo thiết kế, không ảnh hưởng.
2. Pill "Khác" gửi `__other_option__` kèm `entry.1168402147.other_option_response`
   — vì vậy chọn "Khác" sẽ hiện thêm ô text và ô đó là bắt buộc.

Google chặn CORS nên trang **không đọc được** kết quả trả về: `fetch` chạy
`mode: 'no-cors'`, promise resolve chỉ nghĩa là "đã gửi đi", không phải "đã được
ghi nhận". Bù lại, validate phía client được đặt trùng khớp đúng các trường bắt
buộc của Google Form nên không thể xảy ra cảnh gửi thành công mà không có dữ liệu.

Muốn đổi sang dịch vụ khác (Formspree, Basin, Apps Script): thay `data-endpoint`
trên `<form>`. Nếu URL không chứa `docs.google.com/forms`, `main.js` tự chuyển
sang gửi `FormData` kèm `Accept: application/json` và đọc HTTP status như bình
thường. Xoá rỗng `data-endpoint` thì quay về phương án mở email soạn sẵn.

## Nội dung còn phải điền

Các chỗ để trong ngoặc vuông là placeholder từ bản thiết kế, cần thay trước khi
công bố:

- `[Founder / AI Researcher — tóm tắt ngắn…]` — tiểu sử diễn giả AIDo
- `<link rel="canonical">` — đổi sang domain thật khi deploy

Hotline `0983204177 (Thành)`, QR và ảnh diễn giả đã có đủ theo bản design mới nhất.

## Kiểm tra nhanh trước khi deploy

- [ ] Xoá dòng test trong bảng phản hồi Google Form (`TEST — kiểm tra kết nối form`)
- [ ] Kiểm tra ở 375px / 768px / 1440px
- [ ] Điều hướng bằng bàn phím: skip link → nav → form (đủ focus ring)
