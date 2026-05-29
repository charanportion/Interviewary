/** Central SEO config: canonical base URL + per-page metadata helper. */
import type { Metadata } from 'next';
import { PRODUCT_NAME, TAGLINE } from './site';

/**
 * Canonical origin for absolute URLs (canonical tags, OG images, sitemap, robots).
 * Override per-environment with NEXT_PUBLIC_SITE_URL; defaults to production.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://interviewary.dotportion.com';

export const SITE_NAME = PRODUCT_NAME;

/** Default description used on the home page and as the OG/Twitter fallback. */
export const SITE_DESCRIPTION =
  'A Chrome extension that gives non-technical recruiters live answer evaluations, smart follow-up questions, and an auto-generated hiring report — right inside Google Meet. Local-first and bring-your-own-key.';

/** Twitter/X handle to credit on cards (no leading @ stripping needed by Next). */
export const TWITTER_HANDLE = '@dotportion';

type PageMetaInput = {
  /** Page title WITHOUT the " — Interviewary" suffix (the layout template adds it). */
  title: string;
  description: string;
  /** Absolute path from the site root, e.g. "/privacy". Used for the canonical URL. */
  path: string;
};

/**
 * Build per-page Metadata with a canonical URL plus matching OG/Twitter overrides.
 * The OG/Twitter image is inherited from the root `opengraph-image`/`twitter-image`
 * routes, so it does not need to be repeated here.
 */
export function pageMeta({ title, description, path }: PageMetaInput): Metadata {
  const fullTitle = `${title} — ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: path,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
    },
  };
}

/** Tagline reused in structured data. */
export const SITE_TAGLINE = TAGLINE;
