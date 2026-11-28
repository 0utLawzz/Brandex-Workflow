'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { caseLogoSource, safeAssetHref } from '@/lib/asset-url';

export default function CaseLogo({ id, value, name, size = 40 }: { id: number; value?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [id, value]);
  const source = caseLogoSource(id, value);
  const href = safeAssetHref(value);
  if (!source || failed) return <span aria-label={value ? 'Logo preview unavailable' : 'No image'} title={value ? 'Logo preview unavailable; original reference is preserved.' : 'No image'}>—</span>;
  return <a href={href || undefined} target="_blank" rel="noopener noreferrer" aria-label={`View logo for ${name}`}><Image src={source} alt={`${name} logo`} width={size} height={size} unoptimized onError={() => setFailed(true)} className="rounded border object-contain" style={{ width: size, height: size }} /></a>;
}
