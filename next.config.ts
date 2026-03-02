import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// Diciamo a Next.js esattamente dove si trova il tuo file di configurazione
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: '10mb' } }
};

// Esportiamo la configurazione "avvolta" dal plugin di next-intl
export default withNextIntl(nextConfig);