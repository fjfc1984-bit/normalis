import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://app.normalis.co';
  const now  = new Date();

  return [
    {
      url:              base,
      lastModified:     now,
      changeFrequency:  'weekly',
      priority:         1.0,
    },
    {
      url:              `${base}/login`,
      lastModified:     now,
      changeFrequency:  'monthly',
      priority:         0.8,
    },
    {
      url:              `${base}/registro`,
      lastModified:     now,
      changeFrequency:  'monthly',
      priority:         0.8,
    },
    {
      url:              `${base}/demo`,
      lastModified:     now,
      changeFrequency:  'weekly',
      priority:         0.9,
    },
    {
      url:              `${base}/terminos`,
      lastModified:     now,
      changeFrequency:  'yearly',
      priority:         0.3,
    },
    {
      url:              `${base}/politica-privacidad`,
      lastModified:     now,
      changeFrequency:  'yearly',
      priority:         0.3,
    },
  ];
}
