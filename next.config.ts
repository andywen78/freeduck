import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 關掉左下角的開發工具浮標（本來就只在 next dev 出現，正式部署沒有）
  devIndicators: false,
  // /sim 轉給站長自用的當沖模擬器（家裡電腦經 Tailscale Funnel，對方自己要密碼）。
  // 網址放 Vercel 環境變數，不寫進公開 repo；沒設就不開這條路。
  async rewrites() {
    const sim = process.env.SIM_ORIGIN;
    if (!sim) return [];
    return [
      { source: '/sim', destination: `${sim}/sim` },
      { source: '/sim/:path*', destination: `${sim}/sim/:path*` },
    ];
  },
};

export default nextConfig;
