import { zhCN } from '@/i18n/zh-CN';

export function setTitle(parts: Array<string | null | undefined>) {
  const suffix = parts.filter(Boolean).join(' · ');
  document.title = suffix ? `${zhCN.brand} · ${suffix}` : zhCN.brand;
}

