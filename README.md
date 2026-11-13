# Chung Sức Auto Order V2 — Cloudflare Pages + Functions

## Trạng thái
Bản chuyển đổi từ V2 Netlify: giữ HTML/CSS/JS, thay backend bằng Pages Functions native (Request/Response, context.env), route `/api`, không cần Node compatibility. Demo dùng dữ liệu giả, không trừ Xu. Backend đã kiểm thử với mock; chưa xác minh tài liệu/API thật của chungsucliqi.com, chưa triển khai trên tài khoản Cloudflare của bạn. Không tự đoán endpoint, không dùng domain tương tự. `CS_ENABLE_ORDER=false` mặc định. Chỉ dùng cho mã mời bạn có quyền sử dụng.

## 1. Deploy miễn phí bằng GitHub (không cần cài gì)
1. Giải nén ZIP. Tạo repo mới trên https://github.com/new (khuyên dùng Private). Tải toàn bộ nội dung thư mục gốc lên repo, giữ nguyên `public/`, `functions/`, `tests/` và `package.json`. GitHub upload files có thể kéo thả nhiều thư mục; đảm bảo có `functions/api.js` và `public/_routes.json`, `public/_headers`. Không đưa key/mật khẩu thật vào repo. `.dev.vars.example` là mẫu trống.
2. Đăng nhập https://dash.cloudflare.com/ (gói Free). Vào **Workers & Pages > Create application > Pages > Connect to Git** (giao diện có thể ghi Get started hoặc Import an existing Git repository; chọn Pages, không phải Worker độc lập). Kết nối GitHub và cấp quyền repo vừa tạo.
3. Chọn repo, đặt Project name ví dụ `chungsuc-auto` (tùy tên còn trống), Production branch `main` hoặc branch bạn dùng. Framework preset `None`, Build command bỏ trống (hoặc `exit 0` nếu giao diện yêu cầu), Build output directory `public`, Root directory để trống. Không có Deploy command riêng cho Pages.
4. Save and Deploy. Mở URL thật do Cloudflare cấp, dạng `https://chungsuc-auto.pages.dev`. Demo chạy ngay. Không dùng upload ZIP bằng kéo thả trên dashboard vì phương thức đó không compile thư mục Functions; dùng Git integration như trên.

## 2. Lấy API key Chung Sức
Mở https://chungsucliqi.com/profile.php, tại API đặt đơn tự động nhập tên gợi nhớ, bấm Tạo API key. Lưu key riêng tư. Bấm Tài liệu API và đọc chính xác base URL, method, header, payload, response và giá. Không gửi API key, token xác minh hoặc mật khẩu vào chat.

## 3. Cấu hình Cloudflare
Workers & Pages > chọn project Pages > Settings > Variables and Secrets (có thể nằm dưới Functions) > Add. Chọn Production. Dùng Secret/Encrypt cho `CS_API_KEY` và `APP_PASSWORD`; dùng Text cho các cấu hình không bí mật. Không đặt secrets vào mã nguồn, public hoặc GitHub. Không thêm key thật vào Preview trừ khi cần và đã bảo vệ preview.

| Tên | Giá trị |
|---|---|
| APP_PASSWORD | Mật khẩu riêng ngẫu nhiên tối thiểu 16 ký tự, không dùng chung mật khẩu tài khoản |
| CS_API_KEY | Key lấy từ Hồ sơ Chung Sức |
| CS_ENABLE_ORDER | false (giữ tắt đến khi xác minh API) |
| CS_API_KEY_HEADER | Tên header theo tài liệu (không đoán) |
| CS_API_KEY_PREFIX | Tiền tố nếu có; không cần thì bỏ qua |
| CS_BALANCE_PATH | Đường dẫn số dư bắt đầu bằng / |
| CS_SERVICES_PATH | Đường dẫn dịch vụ bắt đầu bằng / |
| CS_ORDERS_PATH | Đường dẫn lịch sử bắt đầu bằng / |
| CS_DETAIL_PATH | Đường dẫn chi tiết bắt đầu bằng / |
| CS_ORDER_PATH | Đường dẫn tạo đơn bắt đầu bằng / |
| CS_MAX_ORDER_TOTAL | Số dương, giới hạn chi phí mỗi lượt theo đơn vị API |

Lưu, vào Deployments và Retry deployment / redeploy production (hoặc push commit mới). Sau đó mở site > Kết nối API > nhập APP_PASSWORD > Kết nối thật. Kiểm tra số dư, dịch vụ và lịch sử; không cần nhập API key trên web. Nếu chưa có tài liệu chính thức, chỉ dùng demo.

## 4. Phạm vi adapter, bật đơn thật và xác minh tên miền
Adapter chỉ gọi HTTPS `chungsucliqi.com`, không theo redirect, dự kiến dùng header auth, GET đọc và POST JSON đặt đơn. Dự kiến response `{success:true,data:...}` với balance/services/orders như V2; payload `package_id`, `quantity`, `referral_codes`, `note`. Giá dự kiến = giá gói × số lượng × số mã. Nếu tài liệu thật khác, cần sửa `functions/api.js` và phần đọc dữ liệu trong `public/app.js`, kiểm thử đọc và đối chiếu giá trước khi bật đặt đơn. Không tự đoán các đường dẫn. Chỉ đổi `CS_ENABLE_ORDER=true` khi đã xác minh API, giới hạn chi tiêu và thực sự muốn trả tiền. Mỗi lần gửi cần xác nhận; timeout thì kiểm tra lịch sử, không tự retry. Chưa có idempotency phía nhà cung cấp được xác minh. Giới hạn chi phí là mỗi request, không phải tổng ngày. Web cá nhân, không dùng chung mật khẩu với nhiều người; nên thêm Cloudflare Access hoặc auth/rate limit bền vững nếu dùng production lâu dài. Không tự đặt theo lịch hay đặt ngầm.

Mục tên miền xác minh của Chung Sức: backend gọi server-to-server nên không cần CORS trình duyệt. Nếu tài liệu yêu cầu verify, nhập hostname Pages thật (ví dụ chungsuc-auto.pages.dev), thực hiện verify đúng hướng dẫn của nhà cung cấp. Không mặc định rằng token này thay API key; không lưu token trong public. Adapter chưa triển khai verify vì chưa có đặc tả.

## 5. Kiểm tra local (tùy chọn)
Cần Node.js 22+. Tại thư mục gốc chạy `npm test` để kiểm thử mock; không gọi API thật. `npm run dev` chạy `npx wrangler pages dev public` (lần đầu cần tải Wrangler). Mở URL local được in ra. Nếu muốn thử cấu hình, copy `.dev.vars.example` thành `.dev.vars`, điền biến local, giữ `CS_ENABLE_ORDER=false`. File này được gitignore. Demo có thể mở trực tiếp public/index.html nhưng live cần Pages Functions.

## Cấu trúc
- public/index.html, style.css, app.js: giao diện V2, route `/api`.
- public/_routes.json: chỉ `/api` gọi Functions để không tính request tĩnh vào quota Functions.
- public/_headers: CSP và header an toàn cho tài nguyên tĩnh.
- functions/api.js: xác thực, gọi API, kiểm tra payload/giá/giới hạn.
- tests/api.test.mjs: kiểm thử mock Request/Response (không gọi thật).

Tài liệu Cloudflare: https://developers.cloudflare.com/pages/get-started/git-integration/ ; https://developers.cloudflare.com/pages/functions/bindings/ ; https://developers.cloudflare.com/pages/functions/pricing/ . Gói Free: 100.000 Functions/Workers requests/ngày tính chung, tài nguyên tĩnh không invoke Functions miễn phí. Đơn hàng của Chung Sức vẫn tính Xu.
