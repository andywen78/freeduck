import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 關掉左下角的開發工具浮標（本來就只在 next dev 出現，正式部署沒有）
  devIndicators: false,
};

export default nextConfig;
