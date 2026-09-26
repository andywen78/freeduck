import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { supabaseAnon } from '@/lib/supabase/anon';
import { toISODate } from '@/lib/types';

/** 每小時重算一次就夠——新供給者不會分秒必爭地需要進 sitemap。 */
export const revalidate = 3600;

const STATIC: MetadataRoute.Sitemap = [
  { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
  { url: `${SITE_URL}/discover`, changeFrequency: 'daily', priority: 0.9 },
  { url: `${SITE_URL}/jobs`, changeFrequency: 'daily', priority: 0.7 },
  // 這兩頁不靠站上的人也有內容，是冷啟動期間唯一能被搜到的東西
  { url: `${SITE_URL}/how-much`, changeFrequency: 'monthly', priority: 0.8 },
  { url: `${SITE_URL}/rates`, changeFrequency: 'weekly', priority: 0.8 },
  { url: `${SITE_URL}/pond`, changeFrequency: 'daily', priority: 0.6 },
  { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isSupabaseConfigured) return STATIC;

  // sitemap 壞掉不該讓整站的收錄跟著停擺，撈不到就只出靜態那幾條
  try {
    const supabase = supabaseAnon();
    const today = toISODate(new Date());

    const [workers, jobs] = await Promise.all([
      supabase.from('profiles').select('id, created_at').neq('status', 'suspended').limit(5000),
      // 已過期或已關閉的工作是死內容，送進 sitemap 只會拉低整份的可信度
      supabase.from('jobs').select('id, created_at').eq('status', 'open').gte('date', today).limit(5000),
    ]);

    const workerUrls: MetadataRoute.Sitemap = (workers.data ?? []).map((w) => ({
      url: `${SITE_URL}/worker/${w.id}`,
      lastModified: new Date(w.created_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const jobUrls: MetadataRoute.Sitemap = (jobs.data ?? []).map((j) => ({
      url: `${SITE_URL}/jobs/${j.id}`,
      lastModified: new Date(j.created_at),
      changeFrequency: 'weekly',
      priority: 0.5,
    }));

    return [...STATIC, ...workerUrls, ...jobUrls];
  } catch {
    return STATIC;
  }
}
