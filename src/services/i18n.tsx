import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'vi' | 'en';

export interface Translations {
  [key: string]: string;
}

const VI_TRANSLATIONS: Translations = {
  // Brand & General
  'app.title': 'VNC Resolver',
  'app.subtitle': 'Trình khám phá dữ liệu VNC Computernewb',
  'app.researchOnly': 'Chỉ dành cho nghiên cứu',
  'app.researchNotice': 'Công cụ khám phá metadata thụ động. Không xác thực từ xa, không thử mật khẩu hay can thiệp phiên làm việc.',
  'app.sourceApi': 'API Nguồn',
  'app.recordsIndexed': 'bản ghi được đánh chỉ mục',
  'app.apiOnline': 'API Hoạt động',
  'app.apiOffline': 'Mất kết nối',
  'app.checking': 'Đang kiểm tra...',
  'app.loading': 'Đang tải dữ liệu...',
  'app.retry': 'Thử lại',
  'app.refresh': 'Làm mới',
  'app.cancel': 'Hủy',
  'app.save': 'Lưu',
  'app.delete': 'Xóa',
  'app.close': 'Đóng',
  'app.apply': 'Áp dụng',
  'app.clear': 'Xóa sạch',
  'app.all': 'Tất cả',
  'app.search': 'Tìm kiếm',

  // Navigation
  'nav.explore': 'Khám phá',
  'nav.search': 'Tìm kiếm tập dữ liệu',
  'nav.random': 'VNC ngẫu nhiên',
  'nav.analytics': 'Phân tích & Thống kê',
  'nav.saved': 'Bản ghi đã lưu',
  'nav.compare': 'So sánh bản ghi',
  'nav.diagnostics': 'Chẩn đoán API',
  'nav.detail': 'Chi tiết bản ghi',

  // Header
  'header.searchPlaceholder': 'Nhập yêu cầu bằng tiếng Việt (VD: tìm vnc ở việt nam cổng 5900)... (/ để tìm)',
  'header.randomButton': 'Ngẫu nhiên',
  'header.cmdPalette': 'Bảng lệnh (Ctrl+K)',

  // Auto Prompt System
  'autoPrompt.title': 'Auto-Prompt AI',
  'autoPrompt.badge': 'Tự động dịch yêu cầu',
  'autoPrompt.enabled': 'Auto-Prompt BẬT',
  'autoPrompt.disabled': 'Auto-Prompt TẮT',
  'autoPrompt.detected': 'Phát hiện câu lệnh tự nhiên:',
  'autoPrompt.convertingTo': 'Chuyển đổi thành bộ lọc:',
  'autoPrompt.applyAndSearch': 'Áp dụng & Tìm kiếm',
  'autoPrompt.analyzing': 'Đang phân tích cú pháp yêu cầu...',
  'autoPrompt.samplePrompts': 'Gợi ý tìm kiếm nhanh bằng tiếng Việt:',
  'autoPrompt.preset.vn': '🇻🇳 VNC ở Việt Nam cổng 5900',
  'autoPrompt.preset.jp': '🇯🇵 Máy tính Windows tại Nhật Bản',
  'autoPrompt.preset.nopass': '🛡️ Không cần mật khẩu ở Đức',
  'autoPrompt.preset.hmi': '🏭 Hệ thống HMI / Scada tại Ý',
  'autoPrompt.preset.live': '⚡ Đang hoạt động (Reachable) ở Mỹ',
  'autoPrompt.preset.viettel': '🌐 Mạng Viettel Telecom',

  // Search View
  'search.pageTitle': 'Tìm kiếm dữ liệu VNC Resolver',
  'search.pageDesc': 'Tìm kiếm theo tên desktop, mã quốc gia ISO, nhà mạng ASN hoặc số ID bản ghi.',
  'search.inputPlaceholder': 'Nhập bất kỳ yêu cầu nào (VD: tìm máy tính ở nhật bản cổng 5900 hoặc country:JP)...',
  'search.btnSearch': 'Tìm kiếm',
  'search.searching': 'Đang tìm kiếm...',
  'search.filterTitle': 'Bộ lọc nâng cao API & Tinh chỉnh cục bộ',
  'search.desktop': 'Tên Desktop',
  'search.country': 'Quốc gia (ISO 2 chữ cái)',
  'search.asn': 'Mã nhà mạng ASN',
  'search.id': 'Mã bản ghi ID',
  'search.port': 'Cổng kết nối',
  'search.resolution': 'Độ phân giải màn hình',
  'search.auth': 'Yêu cầu mật khẩu',
  'search.liveStatus': 'Trạng thái kết nối trực tiếp',
  'search.liveReachable': 'Chỉ máy kết nối được (Reachable)',
  'search.liveOffline': 'Máy ngoại tuyến (Offline)',
  'search.noPass': 'Không có mật khẩu',
  'search.hasPass': 'Yêu cầu mật khẩu',
  'search.autoTest': 'Tự động kiểm tra kết nối sau khi tìm',
  'search.testAll': 'Kiểm tra tất cả kết nối',
  'search.testingProgress': 'Đang tự động kiểm tra kết nối cho {total} kết quả...',
  'search.testCompleted': 'Đã hoàn tất kiểm tra kết nối cho {total} kết quả',
  'search.reachableCount': '{count} Kết nối được',
  'search.offlineCount': '{count} Ngoại tuyến / Hết giờ',
  'search.showReachableOnly': 'Chỉ hiện máy kết nối được ({count})',
  'search.viewCard': 'Thẻ',
  'search.viewTable': 'Bảng',
  'search.resultsCount': 'Tìm thấy {count} bản ghi VNC',
  'search.cachedNotice': 'Dữ liệu lấy từ bộ nhớ đệm nội bộ',
  'search.results': 'Kết quả tìm kiếm',
  'search.cachedData': 'Đang xem dữ liệu lưu trong bộ nhớ đệm từ lúc',
  'search.cardsView': 'Thẻ',
  'search.tableView': 'Bảng',
  'search.testDone': 'Đã hoàn tất kiểm tra kết nối cho',
  'search.saveSearch': 'Lưu tìm kiếm',
  'search.saveSearchTitle': 'Lưu bộ lọc tìm kiếm này',
  'search.savedSearches': 'Tìm kiếm đã lưu:',
  'search.noResults': 'Không tìm thấy bản ghi VNC nào phù hợp với điều kiện.',
  'search.exportJson': 'Xuất JSON',
  'search.exportCsv': 'Xuất CSV',

  // Table Columns
  'table.fav': 'Lưu',
  'table.cmp': 'SS',
  'table.id': 'ID',
  'table.country': 'Quốc gia',
  'table.state': 'Bang/Tỉnh',
  'table.city': 'Thành phố',
  'table.asn': 'Nhà mạng (ASN)',
  'table.port': 'Cổng',
  'table.desktop': 'Tên Desktop',
  'table.resolution': 'Độ phân giải',
  'table.scanDate': 'Ngày quét',
  'table.liveStatus': 'Trạng thái Live',
  'table.action': 'Hành động',

  // Live Check
  'liveCheck.title': 'Kiểm tra kết nối trực tiếp (Live Reachability)',
  'liveCheck.badge.reachable': 'Kết nối được',
  'liveCheck.badge.portReachable': 'Cổng mở (Không phải RFB)',
  'liveCheck.badge.offline': 'Ngoại tuyến',
  'liveCheck.badge.probing': 'Đang kiểm tra...',
  'liveCheck.badge.unchecked': 'Chưa kiểm tra',
  'liveCheck.btnTest': 'Kiểm tra kết nối',
  'liveCheck.banner': 'Cờ hiệu RFB',
  'liveCheck.latency': 'Độ trễ',
  'liveCheck.safeNotice': 'Kiểm tra socket TCP an toàn, không gửi mật khẩu hay can thiệp hệ thống.',

  // Random View
  'random.title': 'Khám phá VNC ngẫu nhiên',
  'random.desc': 'Khám phá các máy chủ VNC ngẫu nhiên được xác thực kết nối trực tiếp.',
  'random.connectableOnly': 'Chỉ tìm máy kết nối được',
  'random.btnNext': 'Tìm VNC ngẫu nhiên tiếp theo',
  'random.finding': 'Đang quét tìm máy kết nối được...',
  'random.history': 'Lịch sử VNC ngẫu nhiên phiên này',

  // Explore View
  'explore.welcome': 'Chào mừng đến với VNC Resolver Explorer',
  'explore.overviewDesc': 'Nền tảng nghiên cứu và thống kê cơ sở dữ liệu VNC toàn cầu.',
  'explore.quickSearch': 'Tìm kiếm nhanh',
  'explore.recentlyViewed': 'Xem gần đây',
  'explore.popularCountries': 'Quốc gia phổ biến',
  'explore.totalIndexed': 'Tổng số bản ghi VNC',

  // Analytics View
  'analytics.title': 'Phân tích & Phân bổ dữ liệu VNC',
  'analytics.desc': 'Thống kê địa lý, độ phân giải màn hình, cổng kết nối và mật khẩu.',
  'analytics.geoDist': 'Phân bổ theo quốc gia',
  'analytics.resDist': 'Phân bổ độ phân giải',
  'analytics.authDist': 'Tỷ lệ mật khẩu',
  'analytics.asnDist': 'Top mạng ASN',

  // Detail View
  'detail.back': 'Quay lại danh sách',
  'detail.title': 'Chi tiết máy chủ VNC #{id}',
  'detail.systemInfo': 'Thông tin hệ thống',
  'detail.screenMetrics': 'Thông số màn hình',
  'detail.networkGeo': 'Mạng & Địa lý',
  'detail.connectionStrings': 'Cú pháp kết nối an toàn',
  'detail.researchNotes': 'Ghi chú nghiên cứu',
  'detail.tags': 'Thẻ phân loại',
  'detail.saveRecord': 'Lưu bản ghi',
  'detail.saved': 'Đã lưu',
  'detail.compare': 'So sánh',
  'detail.compared': 'Đang so sánh',
  'details.unnamed': 'Không tên',
  'details.noScreenshot': 'Không có ảnh chụp màn hình',
  'compare.title': 'So sánh',

  // Language switcher
  'lang.vi': 'Tiếng Việt',
  'lang.en': 'English',
  'lang.switch': 'Ngôn ngữ / Language',
};

const EN_TRANSLATIONS: Translations = {
  // Brand & General
  'app.title': 'VNC Resolver',
  'app.subtitle': 'Computernewb VNC Resolver Dataset Explorer',
  'app.researchOnly': 'Research Tool Only',
  'app.researchNotice': 'Passive metadata explorer. No remote authentication, password attempts, or session injection.',
  'app.sourceApi': 'Source API',
  'app.recordsIndexed': 'records indexed',
  'app.apiOnline': 'API Online',
  'app.apiOffline': 'Offline',
  'app.checking': 'Checking...',
  'app.loading': 'Loading data...',
  'app.retry': 'Retry',
  'app.refresh': 'Refresh',
  'app.cancel': 'Cancel',
  'app.save': 'Save',
  'app.delete': 'Delete',
  'app.close': 'Close',
  'app.apply': 'Apply',
  'app.clear': 'Clear',
  'app.all': 'All',
  'app.search': 'Search',

  // Navigation
  'nav.explore': 'Explore',
  'nav.search': 'Dataset Search',
  'nav.random': 'Random Discovery',
  'nav.analytics': 'Analytics & Stats',
  'nav.saved': 'Saved Records',
  'nav.compare': 'Compare Records',
  'nav.diagnostics': 'API Diagnostics',
  'nav.detail': 'Record Details',

  // Header
  'header.searchPlaceholder': 'Search natural language (e.g. windows in japan port 5900) or syntax... (Press /)',
  'header.randomButton': 'Random',
  'header.cmdPalette': 'Command Palette (Ctrl+K)',

  // Auto Prompt System
  'autoPrompt.title': 'Auto-Prompt AI',
  'autoPrompt.badge': 'Auto Query Translation',
  'autoPrompt.enabled': 'Auto-Prompt ON',
  'autoPrompt.disabled': 'Auto-Prompt OFF',
  'autoPrompt.detected': 'Detected natural language query:',
  'autoPrompt.convertingTo': 'Converting to search filters:',
  'autoPrompt.applyAndSearch': 'Apply & Search Now',
  'autoPrompt.analyzing': 'Analyzing query syntax...',
  'autoPrompt.samplePrompts': 'Quick prompts:',
  'autoPrompt.preset.vn': '🇻🇳 VNC in Vietnam port 5900',
  'autoPrompt.preset.jp': '🇯🇵 Windows desktops in Japan',
  'autoPrompt.preset.nopass': '🛡️ No password in Germany',
  'autoPrompt.preset.hmi': '🏭 Industrial HMI in Italy',
  'autoPrompt.preset.live': '⚡ Reachable servers in US',
  'autoPrompt.preset.viettel': '🌐 Viettel Telecom network',

  // Search View
  'search.pageTitle': 'VNC Resolver Dataset Search',
  'search.pageDesc': 'Search by desktop name, ISO 2-letter country code, ASN provider, or record ID.',
  'search.inputPlaceholder': 'Type any request (e.g. find windows computers in japan on port 5900 or country:JP)...',
  'search.btnSearch': 'Search',
  'search.searching': 'Searching...',
  'search.filterTitle': 'API Parameters & Client Refinement',
  'search.desktop': 'Desktop Name',
  'search.country': 'Country (ISO 2-letter)',
  'search.asn': 'ASN Provider',
  'search.id': 'Record ID',
  'search.port': 'Port',
  'search.resolution': 'Screen Resolution',
  'search.auth': 'Password Authentication',
  'search.liveStatus': 'Live Connectivity',
  'search.liveReachable': 'Reachable Only',
  'search.liveOffline': 'Offline Only',
  'search.noPass': 'No Password Required',
  'search.hasPass': 'Requires Password',
  'search.autoTest': 'Auto-test connectivity on search',
  'search.testAll': 'Test All Connections',
  'search.testingProgress': 'Auto-testing connection for {total} search results...',
  'search.testCompleted': 'Automatic connectivity test completed for {total} results',
  'search.reachableCount': '{count} Reachable',
  'search.offlineCount': '{count} Offline / Timeout',
  'search.showReachableOnly': 'Show Reachable ({count})',
  'search.viewCard': 'Cards',
  'search.viewTable': 'Table',
  'search.resultsCount': 'Found {count} VNC records',
  'search.cachedNotice': 'Served from internal cache',
  'search.results': 'Search Results',
  'search.cachedData': 'Showing cached data from',
  'search.cardsView': 'Cards',
  'search.tableView': 'Table',
  'search.testDone': 'Automatic connectivity test completed for',
  'search.saveSearch': 'Save Search',
  'search.saveSearchTitle': 'Save this search configuration',
  'search.savedSearches': 'Saved searches:',
  'search.noResults': 'No VNC records found matching the requested criteria.',
  'search.exportJson': 'Export JSON',
  'search.exportCsv': 'Export CSV',

  // Table Columns
  'table.fav': 'Fav',
  'table.cmp': 'Cmp',
  'table.id': 'ID',
  'table.country': 'Country',
  'table.state': 'State',
  'table.city': 'City',
  'table.asn': 'ASN',
  'table.port': 'Port',
  'table.desktop': 'Desktop',
  'table.resolution': 'Resolution',
  'table.scanDate': 'Scan Date',
  'table.liveStatus': 'Live Status',
  'table.action': 'Action',

  // Live Check
  'liveCheck.title': 'Live Reachability Verification',
  'liveCheck.badge.reachable': 'Reachable',
  'liveCheck.badge.portReachable': 'Port Open (Non-RFB)',
  'liveCheck.badge.offline': 'Offline',
  'liveCheck.badge.probing': 'Probing...',
  'liveCheck.badge.unchecked': 'Unchecked',
  'liveCheck.btnTest': 'Test Connection',
  'liveCheck.banner': 'RFB Banner',
  'liveCheck.latency': 'Latency',
  'liveCheck.safeNotice': 'Safe non-intrusive TCP socket handshake only. No credentials sent.',

  // Random View
  'random.title': 'Verified Connectable Random Discovery',
  'random.desc': 'Discovers random VNC servers verified to be live and responding to socket handshake.',
  'random.connectableOnly': 'Connectable Only',
  'random.btnNext': 'Next Random VNC',
  'random.finding': 'Scanning for live connectable VNC server...',
  'random.history': 'Discovered Connectable Trail',

  // Explore View
  'explore.welcome': 'Welcome to VNC Resolver Explorer',
  'explore.overviewDesc': 'Global research platform and metadata visualizer for VNC records.',
  'explore.quickSearch': 'Quick Search',
  'explore.recentlyViewed': 'Recently Viewed',
  'explore.popularCountries': 'Popular Countries',
  'explore.totalIndexed': 'Total VNC Records',

  // Analytics View
  'analytics.title': 'Dataset Analytics & Distribution',
  'analytics.desc': 'Geographic distribution, resolutions, ports and security breakdown.',
  'analytics.geoDist': 'Country Distribution',
  'analytics.resDist': 'Resolution Distribution',
  'analytics.authDist': 'Password Requirement Ratio',
  'analytics.asnDist': 'Top ASN Providers',

  // Detail View
  'detail.back': 'Back to explorer',
  'detail.title': 'VNC Server #{id}',
  'detail.systemInfo': 'System Information',
  'detail.screenMetrics': 'Screen Metrics',
  'detail.networkGeo': 'Network & Geography',
  'detail.connectionStrings': 'Safe Connection Strings',
  'detail.researchNotes': 'Research Notes',
  'detail.tags': 'Tags & Collections',
  'detail.saveRecord': 'Save Record',
  'detail.saved': 'Saved',
  'detail.compare': 'Compare',
  'detail.compared': 'In Compare',
  'details.unnamed': 'Unnamed',
  'details.noScreenshot': 'No screenshot available',
  'compare.title': 'Compare',

  // Language switcher
  'lang.vi': 'Tiếng Việt',
  'lang.en': 'English',
  'lang.switch': 'Language / Ngôn ngữ',
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: 'vi',
  setLanguage: () => {},
  t: (key) => key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to Vietnamese as requested by user
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('vnc_resolver_language');
      if (saved === 'vi' || saved === 'en') return saved;
    } catch {}
    return 'vi';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('vnc_resolver_language', lang);
    } catch {}
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = language === 'vi' ? VI_TRANSLATIONS : EN_TRANSLATIONS;
    let str = dict[key] || EN_TRANSLATIONS[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return str;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
