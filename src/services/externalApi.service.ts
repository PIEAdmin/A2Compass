// src/services/externalApi.service.ts
// Central API service — ALL external calls routed through Supabase RPC proxy
// This avoids CORS issues and provides automatic server-side caching.

import { supabase } from './supabase';

// ─── Interfaces ────────────────────────────────────────────────

export interface ApiSetting {
  id: string;
  api_source: string;
  enabled: boolean;
  api_key: string | null;
  rate_limit_per_hour: number;
  last_error: string | null;
  last_error_at: string | null;
  request_count_today: number;
  request_count_reset_at: string;
  updated_at: string;
}

export interface NasaApod {
  title: string;
  explanation: string;
  url: string;
  hdurl: string;
  media_type: string;
  date: string;
  copyright?: string;
}

export interface NasaImage {
  nasa_id: string;
  title: string;
  description: string;
  thumbnail: string;
  date_created: string;
  center: string;
}

export interface OerResult {
  title: string;
  description: string;
  author: string;
  license: string;
  license_url: string;
  url: string;
}

export interface OerResponse {
  results: OerResult[];
  total?: number;
  fallback?: boolean;
  searchUrl?: string;
  error?: boolean;
  message?: string;
}

export interface DataGovResult {
  title: string;
  description: string;
  publisher: string;
  keywords: string[];
  landingPage: string;
}

export interface DataGovResponse {
  results: DataGovResult[];
  error?: boolean;
  message?: string;
}

export interface EuropeanaItem {
  id: string;
  title: string;
  creator: string;
  thumbnail: string;
  year: string;
  provider: string;
  rights: string;
  link: string;
}

export interface EuropeanaResponse {
  items: EuropeanaItem[];
  total?: number;
  fallback?: boolean;
  error?: boolean;
  message?: string;
}

export interface ApiError {
  error: true;
  message: string;
}

// ─── Core Proxy Function ────────────────────────────────────────

/**
 * All external API calls go through this server-side proxy.
 * The Supabase RPC function handles caching, rate limits, and error tracking.
 */
async function fetchViaProxy(apiSource: string, url: string): Promise<any> {
  const { data, error } = await supabase.rpc('fetch_external_api', {
    p_api_source: apiSource,
    p_url: url,
  });

  if (error) {
    throw new Error(error.message || 'Proxy request failed');
  }

  if (data?.error) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
}

// ─── Settings Functions ─────────────────────────────────────────

export async function isApiEnabled(apiSource: string): Promise<boolean> {
  const { data } = await supabase
    .from('api_settings')
    .select('enabled')
    .eq('api_source', apiSource)
    .single();
  return data?.enabled ?? false;
}

export async function getApiSettings(): Promise<ApiSetting[]> {
  const { data } = await supabase
    .from('api_settings')
    .select('*')
    .order('api_source');
  return (data as ApiSetting[]) ?? [];
}

export async function updateApiSetting(
  apiSource: string,
  updates: Partial<Pick<ApiSetting, 'enabled' | 'api_key'>>
): Promise<void> {
  await supabase
    .from('api_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('api_source', apiSource);
}

export async function clearCache(apiSource?: string): Promise<number> {
  let query = supabase.from('api_cache').delete();
  if (apiSource) {
    query = query.eq('api_source', apiSource);
  } else {
    query = query.neq('api_source', ''); // delete all
  }
  const { count } = await query.select('*', { count: 'exact', head: true });
  // Actually delete
  if (apiSource) {
    await supabase.from('api_cache').delete().eq('api_source', apiSource);
  } else {
    await supabase.from('api_cache').delete().neq('api_source', '');
  }
  return count ?? 0;
}

export async function getCacheStats(): Promise<{ total: number; oldest: string | null }> {
  const { count } = await supabase
    .from('api_cache')
    .select('*', { count: 'exact', head: true });

  const { data } = await supabase
    .from('api_cache')
    .select('cached_at')
    .order('cached_at', { ascending: true })
    .limit(1);

  return {
    total: count ?? 0,
    oldest: data?.[0]?.cached_at ?? null,
  };
}

// ─── NASA Functions ─────────────────────────────────────────────

export async function getNasaApod(): Promise<NasaApod | ApiError> {
  try {
    const raw = await fetchViaProxy(
      'nasa_apod',
      'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY'
    );

    return {
      title: raw.title ?? 'Astronomy Picture of the Day',
      explanation: raw.explanation ?? '',
      url: raw.url ?? '',
      hdurl: raw.hdurl ?? raw.url ?? '',
      media_type: raw.media_type ?? 'image',
      date: raw.date ?? new Date().toISOString().split('T')[0],
      copyright: raw.copyright ?? undefined,
    };
  } catch (err: any) {
    return {
      error: true,
      message: 'Unable to load the Astronomy Picture of the Day right now.',
    };
  }
}

export async function searchNasaImages(
  query: string,
  page = 1
): Promise<{ images: NasaImage[]; total: number } | ApiError> {
  try {
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(
      query
    )}&media_type=image&page=${page}`;
    const raw = await fetchViaProxy('nasa_images', url);

    const items = raw?.collection?.items ?? [];
    const images: NasaImage[] = items.slice(0, 12).map((item: any) => {
      const d = item.data?.[0] ?? {};
      const thumb = item.links?.[0]?.href ?? '';
      return {
        nasa_id: d.nasa_id ?? '',
        title: d.title ?? 'NASA Image',
        description: (d.description ?? '').substring(0, 200),
        thumbnail: thumb,
        date_created: d.date_created ?? '',
        center: d.center ?? 'NASA',
      };
    });

    return {
      images,
      total: raw?.collection?.metadata?.total_hits ?? images.length,
    };
  } catch (err: any) {
    return {
      error: true,
      message: 'Unable to search NASA images right now.',
    };
  }
}

// ─── OER Commons Functions ─────────────────────────────────────

export async function searchOerCommons(params: {
  keyword?: string;
  subject?: string;
  grade?: string;
}): Promise<OerResponse> {
  try {
    // Check if we have an API token
    const { data: settings } = await supabase
      .from('api_settings')
      .select('api_key, enabled')
      .eq('api_source', 'oer_commons')
      .single();

    if (!settings?.enabled) {
      return { results: [], error: true, message: 'OER search is disabled.' };
    }

    // Build OER Commons search URL for fallback link
    const searchParams = new URLSearchParams();
    if (params.keyword) searchParams.append('f.search', params.keyword);
    if (params.subject) searchParams.append('f.general_subject', params.subject);
    if (params.grade) searchParams.append('f.sublevel', params.grade);
    searchParams.append('f.cou_bucket', 'remix-and-share');
    const searchUrl = `https://www.oercommons.org/search?${searchParams.toString()}`;

    if (!settings?.api_key) {
      // No API token — return fallback with link
      return {
        results: [],
        fallback: true,
        searchUrl,
        message: 'Browse OER Commons directly for free, openly licensed resources.',
      };
    }

    // If we have a token, use the API
    const apiUrl = `https://www.oercommons.org/api/search?token=${settings.api_key}&${searchParams.toString()}&batch_size=12`;
    const raw = await fetchViaProxy('oer_commons', apiUrl);

    const results: OerResult[] = (raw?.items ?? []).map((item: any) => ({
      title: item.title ?? 'Untitled Resource',
      description: (item.abstract ?? '').substring(0, 200),
      author: item.provider?.name ?? 'Unknown Author',
      license: item.license?.description ?? 'Open License',
      license_url: item.license?.url ?? '',
      url: item.url ?? `https://www.oercommons.org${item.path ?? ''}`,
    }));

    return { results, total: raw?.total_items ?? results.length };
  } catch (err: any) {
    return {
      results: [],
      fallback: true,
      searchUrl: 'https://www.oercommons.org/search',
      message: 'Browse OER Commons directly for free resources.',
    };
  }
}

// ─── Data.gov Functions ─────────────────────────────────────────

export async function searchDataGov(
  query: string,
  perPage = 5
): Promise<DataGovResponse> {
  try {
    // Use the new Data.gov search API
    const url = `https://catalog.data.gov/search?q=${encodeURIComponent(query)}&per_page=${perPage}`;
    const raw = await fetchViaProxy('data_gov', url);

    const results: DataGovResult[] = (raw?.results ?? []).map((r: any) => ({
      title: r.title ?? 'Untitled Dataset',
      description: typeof r.description === 'string' ? r.description.substring(0, 300) : (r.description ?? '').toString().substring(0, 300),
      publisher: r.publisher ?? r.organization?.name ?? 'U.S. Government',
      keywords: (r.keyword ?? []).slice(0, 8),
      landingPage: r.identifier ?? (r.slug ? `https://catalog.data.gov/dataset/${r.slug}` : 'https://catalog.data.gov'),
    }));

    return { results };
  } catch (err: any) {
    return {
      error: true,
      message: 'Unable to search Data.gov right now.',
      results: [],
    };
  }
}

// ─── Europeana Functions ────────────────────────────────────────

export async function searchEuropeana(
  query: string,
  rows = 12
): Promise<EuropeanaResponse> {
  try {
    // Check for API key
    const { data: settings } = await supabase
      .from('api_settings')
      .select('api_key, enabled')
      .eq('api_source', 'europeana')
      .single();

    if (!settings?.enabled) {
      return { items: [], error: true, message: 'Europeana is disabled.' };
    }

    if (!settings?.api_key) {
      // Fallback mode — return curated famous artworks
      return {
        items: [],
        fallback: true,
        message: 'Register for a free Europeana API key to see cultural heritage content.',
      };
    }

    const url = `https://api.europeana.eu/record/v2/search.json?wskey=${settings.api_key}&query=${encodeURIComponent(query)}&rows=${rows}&media=true&thumbnail=true&reusability=open`;
    const raw = await fetchViaProxy('europeana', url);

    const items: EuropeanaItem[] = (raw?.items ?? []).map((item: any) => ({
      id: item.id ?? '',
      title: (item.title ?? ['Untitled'])[0],
      creator: (item.dcCreator ?? ['Unknown'])[0],
      thumbnail: item.edmPreview?.[0] ?? '',
      year: item.year?.[0] ?? '',
      provider: (item.dataProvider ?? ['Unknown'])[0],
      rights: (item.rights ?? [''])[0],
      link: item.guid ?? `https://www.europeana.eu/item${item.id}`,
    }));

    return { items, total: raw?.totalResults ?? items.length };
  } catch (err: any) {
    return {
      items: [],
      fallback: true,
      message: 'Browse Europeana directly for cultural heritage content.',
    };
  }
}
