// Vercel Serverless Function: /api/collect-user
// Thu thập thông tin người dùng, lưu trữ hồ sơ hội viên VIP và phân tích vận số
const fs = require('fs');
const path = require('path');

// In-memory cache for serverless instance lifetime
let leadsMemory = [];
const TMP_FILE = '/tmp/collected_leads.json';

// Nạp dữ liệu từ /tmp nếu có
try {
  if (fs.existsSync(TMP_FILE)) {
    leadsMemory = JSON.parse(fs.readFileSync(TMP_FILE, 'utf8'));
  }
} catch (e) {
  // Bỏ qua lỗi đọc file tạm
}

module.exports = async (req, res) => {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const { action, key } = req.query || {};
    // Xuất dữ liệu bảo mật cho quản trị viên
    if (action === 'export' && key === 'vietlott_admin_vip_2026') {
      return res.status(200).json({
        total: leadsMemory.length,
        leads: leadsMemory
      });
    }

    return res.status(200).json({
      status: 'active',
      service: 'Vietlott AI VIP Membership & Lead Engine',
      registered_users_sample: Math.max(128, leadsMemory.length + 350)
    });
  }

  if (req.method === 'POST') {
    try {
      let data = req.body;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) {}
      }
      data = data || {};

      const {
        name,
        phone,
        email,
        birthday,
        zodiac,
        favoriteGame,
        method = 'quick_login',
        notes
      } = data;

      if (!name && !phone && !email) {
        return res.status(400).json({
          error: 'Vui lòng cung cấp ít nhất Số điện thoại, Email hoặc Họ tên'
        });
      }

      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
      const record = {
        id: 'VIP_' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase(),
        timestamp: new Date().toISOString(),
        name: (name || 'Hội viên Vietlott VIP').trim(),
        phone: (phone || '').trim(),
        email: (email || '').trim(),
        birthday: birthday || '',
        zodiac: zodiac || 'Cát Tinh',
        favoriteGame: favoriteGame || 'lotto535',
        method: method,
        notes: notes || '',
        ip: clientIp.split(',')[0].trim()
      };

      // Đưa vào mảng bộ nhớ
      leadsMemory.unshift(record);
      if (leadsMemory.length > 500) {
        leadsMemory = leadsMemory.slice(0, 500);
      }

      // Lưu xuống /tmp nếu có quyền ghi
      try {
        fs.writeFileSync(TMP_FILE, JSON.stringify(leadsMemory, null, 2), 'utf8');
      } catch (err) {
        // Ignored on serverless read-only
      }

      // Trả về thông số thần số học / con số bản mệnh may mắn cá nhân hóa
      const luckySeed = (record.phone || record.name || '999').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const personalLuckyNumber = (luckySeed % 35) + 1;
      const secondaryLuckyNumber = ((luckySeed * 7) % 35) + 1;

      return res.status(200).json({
        success: true,
        message: 'Đăng nhập & Kích hoạt Hội Viên Ma Trận VIP thành công!',
        profile: {
          vipId: record.id,
          name: record.name,
          phone: record.phone,
          email: record.email,
          zodiac: record.zodiac,
          badge: 'Hội Viên Ma Trận VIP 2026',
          personalLuckyNumbers: [personalLuckyNumber, secondaryLuckyNumber],
          joinedAt: record.timestamp
        }
      });
    } catch (err) {
      console.error('Lỗi lưu lead:', err);
      return res.status(500).json({ error: 'Lỗi máy chủ nội bộ', details: err.message });
    }
  }

  return res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
};
