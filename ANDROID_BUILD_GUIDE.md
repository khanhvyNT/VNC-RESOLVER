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
