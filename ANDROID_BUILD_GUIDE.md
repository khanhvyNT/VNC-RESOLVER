# VNC Resolver - Android App Guide

Dự án này đã được cấu hình sẵn 2 phiên bản Android hoàn chỉnh để bạn lựa chọn build ra file APK:

---

## 📱 Lựa chọn 1: Capacitor APK (Gói gọn 100% Web App vào Android Studio)
> **Khuyên dùng**: Toàn bộ tính năng VNC Resolver Explorer (Giao diện Cyberpunk, Auto-Prompt AI, bản đồ, lọc quốc gia/ASN, kiểm tra live port & RFB handshake, cache) đều chạy nguyên bản trong ứng dụng Android.

### Vị trí thư mục:
`/android`

### Các bước build file APK:
1. **Yêu cầu**: Cài đặt [Android Studio](https://developer.android.com/studio) và JDK 17+.
2. **Mở dự án**:
   - Khởi động Android Studio.
   - Chọn **Open** -> Điều hướng tới thư mục `android/` của dự án này.
   - Chờ Gradle đồng bộ (Sync Project with Gradle Files).
3. **Build APK**:
   - Trên thanh menu của Android Studio: chọn **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - Hoặc chạy bằng lệnh Terminal:
     ```bash
     cd android
     ./gradlew assembleDebug
     ```
4. **Lấy file APK cài đặt**:
   - File APK tạo ra tại đường dẫn: `android/app/build/outputs/apk/debug/app-debug.apk`.
   - Copy file này sang điện thoại Android hoặc cài thẳng vào máy ảo (Emulator).

### 💡 Lưu ý về lỗi "Failed to fetch" trên Android đã được khắc phục:
- **Nguyên nhân**: Ban đầu ứng dụng cố gọi qua proxy backend container Cloud Run (`ais-pre-...run.app`). Thiết bị Android bên ngoài không có cookie phiên của Google AI Studio nên bị chặn hoặc lỗi CORS gây ra `Failed to fetch`.
- **Giải pháp đã triển khai**:
  1. Kích hoạt plugin native **`CapacitorHttp`** trong `capacitor.config.ts` để bypass toàn bộ giới hạn mạng của WebView.
  2. Tự động chuyển hướng các lệnh gọi API (`/search`, `/stats`, `/random`, `/id`) trực tiếp đến server chính thức **`https://computernewb.com/vncresolver/api/v1/`** (đã bật sẵn `Access-Control-Allow-Origin: *`).
  3. Bổ sung cơ chế **Failover tự động**: nếu bất kỳ request nào gặp lỗi mạng, app sẽ lập tức fallback sang kết nối trực tiếp đến Computernewb.
  4. Trong giao diện app (nút **Diagnostics & Telemetry** ở thanh header), bạn có thể nhập URL Bridge Server tùy chỉnh nếu triển khai server Node riêng.
  5. Cập nhật lại bản build: Bạn chỉ cần vào thư mục `android/` và chạy lại `./gradlew assembleDebug` (hoặc nhấn Rebuild trong Android Studio) là APK mới sẽ hoạt động mượt mà ngay lập tức!

---

## 🚀 Lựa chọn 2: 100% Native Android (Kotlin + Jetpack Compose)
> Mã nguồn thuần Android viết bằng Kotlin, giao diện Material 3 Declarative UI, mạng Retrofit2, kiến trúc MVVM + Coroutines, và kiểm tra socket TCP trực tiếp trên thiết bị.

### Vị trí thư mục:
`/android-native`

### Các thành phần chính:
- **`data/api/VncApiService.kt`**: Retrofit kết nối trực tiếp API VNC Resolver.
- **`data/repository/VncRepository.kt`**: Quản lý truy vấn dữ liệu và tích hợp probe TCP/RFB banner trực tiếp qua Java Socket.
- **`ui/viewmodel/VncViewModel.kt`**: Quản lý StateFlow và xử lý luồng dữ liệu bất đồng bộ.
- **`ui/screens/HomeScreen.kt`**: Màn hình tìm kiếm, lọc quốc gia, hiển thị danh sách VNC và trạng thái kết nối.
- **`ui/theme/Theme.kt`**: Giao diện tối Dark Cyan/Zinc phong cách Cyberpunk.

### Các bước build APK Native:
1. Mở Android Studio, chọn **Open** -> Thư mục `android-native/`.
2. Cho phép Gradle tải dependencies (Retrofit, Compose BOM, Coil).
3. Chọn **Build** > **Build APK(s)** hoặc chạy:
   ```bash
   cd android-native
   ./gradlew assembleDebug
   ```
4. File APK sinh ra tại: `android-native/app/build/outputs/apk/debug/app-debug.apk`.
