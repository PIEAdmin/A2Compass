// src/services/externalApi.service.ts
// Central API service for all external API integrations in A² Compass

import { supabase } from './supabase';

// ─── Interfaces ────────────────────────────────────────────────

export interface CachedData {
  id: string;
  api_source: string;
  cache_key: string;
  data: any;
  expires_at: string;
  created_at: string;
}

export interface ApiSetting {
  id: string;
  api_source: string;
  enabled: boolean;
  api_key: string | null;
  last_error: string | null;
  request_count_today: number;
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
  url: string;
}

export interface OerResponse {
  results?: OerResult[];
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
  description: string;
  thumbnail: string;
  provider: string;
  dataProvider: string;
  rights: string;
  edmIsShownAt: string;
}

export interface EuropeanaResponse {
  items?: EuropeanaItem[];
  fallback?: boolean;
  searchUrl?: string;
  error?: boolean;
  message?: string;
}

export interface ApiError {
  error: true;
  message: string;
}

// ─── Cache Layer ───────────────────────────────────────────────

/**
 * Retrieve cached data if it exists and hasn't expired.
 */
export async function getCachedData(apiSource: string, cacheKey: string): Promise<any | null> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('api_cache')
      .select('data, expires_at')
      .eq('api_source', apiSource)
      .eq('cache_key', cacheKey)
      .gt('expires_at', now)
      .maybeSingle();

    if (error || !data) return null;
    return data.data;
  } catch {
    return null;
  }
}

/**
 * Upsert data into the api_cache table with a TTL.
 */
export async function setCachedData(
  apiSource: string,
  cacheKey: string,
  data: any,
  ttlHours = 24
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
    await supabase.from('api_cache').upsert(
      {
        api_source: apiSource,
        cache_key: cacheKey,
        data,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'api_source,cache_key' }
    );
  } catch (err) {
    console.error('[setCachedData] Failed to write cache:', err);
  }
}

/**
 * Check whether an API source is enabled in api_settings.
 */
export async function isApiEnabled(apiSource: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('api_settings')
      .select('enabled')
      .eq('api_source', apiSource)
      .maybeSingle();

    if (error || !data) return true; // Default to enabled if no setting exists
    return data.enabled;
  } catch {
    return true; // Fail-open so content still loads
  }
}

/**
 * Retrieve the API key for a given source from api_settings.
 */
async function getApiKey(apiSource: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('api_settings')
      .select('api_key')
      .eq('api_source', apiSource)
      .maybeSingle();

    if (error || !data) return null;
    return data.api_key;
  } catch {
    return null;
  }
}

/**
 * Increment the daily request counter for an API source.
 */
async function incrementRequestCount(apiSource: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('api_settings')
      .select('request_count_today')
      .eq('api_source', apiSource)
      .maybeSingle();

    const currentCount = data?.request_count_today ?? 0;
    await supabase
      .from('api_settings')
      .update({ request_count_today: currentCount + 1 })
      .eq('api_source', apiSource);
  } catch {
    // Non-critical — silently ignore
  }
}

/**
 * Record the last error message for an API source.
 */
async function recordApiError(apiSource: string, message: string): Promise<void> {
  try {
    await supabase
      .from('api_settings')
      .update({ last_error: message, updated_at: new Date().toISOString() })
      .eq('api_source', apiSource);
  } catch {
    // Non-critical
  }
}

/**
 * Clear expired cache entries, or all entries for a specific source.
 */
export async function clearCache(apiSource?: string): Promise<void> {
  try {
    if (apiSource) {
      await supabase.from('api_cache').delete().eq('api_source', apiSource);
    } else {
      // Delete all expired entries
      const now = new Date().toISOString();
      await supabase.from('api_cache').delete().lt('expires_at', now);
    }
  } catch (err) {
    console.error('[clearCache] Failed:', err);
  }
}

// ─── NASA Functions ────────────────────────────────────────────

/**
 * Fetch NASA Astronomy Picture of the Day.
 * Uses DEMO_KEY — no user key required.
 * Cached for 24 hours.
 */
export async function getNasaApod(): Promise<NasaApod | ApiError> {
  const source = 'nasa_apod';
  try {
    // Check if API is enabled
    const enabled = await isApiEnabled(source);
    if (!enabled) {
      return { error: true, message: 'NASA APOD is currently disabled by your administrator.' };
    }

    // Check cache
    const cached = await getCachedData(source, 'apod_today');
    if (cached) return cached as NasaApod;

    // Fetch from NASA
    const response = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY');
    if (!response.ok) {
      throw new Error(`NASA API responded with status ${response.status}`);
    }

    const raw = await response.json();
    const apod: NasaApod = {
      title: raw.title ?? 'Astronomy Picture of the Day',
      explanation: raw.explanation ?? '',
      url: raw.url ?? '',
      hdurl: raw.hdurl ?? raw.url ?? '',
      media_type: raw.media_type ?? 'image',
      date: raw.date ?? new Date().toISOString().split('T')[0],
      copyright: raw.copyright ?? undefined,
    };

    // Cache for 24 hours
    await setCachedData(source, 'apod_today', apod, 24);
    await incrementRequestCount(source);

    return apod;
  } catch (err: any) {
    const message = 'Unable to load the Astronomy Picture of the Day right now.';
    await recordApiError(source, err?.message ?? message);
    return { error: true, message };
  }
}

/**
 * Search NASA Image and Video Library.
 * No API key needed.
 */
export async function searchNasaImages(
  query: string,
  page = 1
): Promise<NasaImage[] | ApiError> {
  const source = 'nasa_images';
  try {
    const enabled = await isApiEnabled(source);
    if (!enabled) {
      return { error: true, message: 'NASA Images is currently disabled by your administrator.' };
    }

    const cacheKey = `search_${query}_p${page}`;
    const cached = await getCachedData(source, cacheKey);
    if (cached) return cached as NasaImage[];

    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image&page=${page}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NASA Images API responded with status ${response.status}`);
    }

    const raw = await response.json();
    const items = raw?.collection?.items ?? [];

    const images: NasaImage[] = items.slice(0, 20).map((item: any) => {
      const d = item.data?.[0] ?? {};
      const thumbLink = item.links?.find((l: any) => l.rel === 'preview');
      return {
        nasa_id: d.nasa_id ?? '',
        title: d.title ?? 'Untitled',
        description: (d.description ?? '').substring(0, 300),
        thumbnail: thumbLink?.href ?? '',
        date_created: d.date_created ?? '',
        center: d.center ?? '',
      };
    });

    await setCachedData(source, cacheKey, images, 12);
    await incrementRequestCount(source);

    return images;
  } catch (err: any) {
    const message = 'Unable to search NASA images right now.';
    await recordApiError(source, err?.message ?? message);
    return { error: true, message };
  }
}

// ─── OER Commons Functions ─────────────────────────────────────

/**
 * Search OER Commons for openly-licensed educational resources.
 * Filters to CC-BY and CC-BY-SA licenses only.
 * Requires an API token stored in api_settings.
 */
export async function searchOerCommons(params: {
  subject?: string;
  grade?: number;
  keyword?: string;
}): Promise<OerResponse> {
  const source = 'oer_commons';
  try {
    const enabled = await isApiEnabled(source);
    if (!enabled) {
      return { error: true, message: 'OER Commons search is currently disabled by your administrator.' };
    }

    const { subject, grade, keyword } = params;

    // Build the search URL (used for both API and fallback)
    const searchParams = new URLSearchParams();
    if (keyword) searchParams.append('f.search', keyword);
    if (subject) searchParams.append('f.general_subject', subject);
    if (grade !== undefined) searchParams.append('f.grade', String(grade));
    // Only open licenses
    searchParams.append('f.license', 'cc-by');
    searchParams.append('f.license', 'cc-by-sa');
    searchParams.append('f.cou_bucket', 'remix-and-share');

    const token = await getApiKey(source);
    if (!token) {
      // Fallback — direct the user to the OER Commons website
      const searchUrl = `https://www.oercommons.org/search?${searchParams.toString()}`;
      return { fallback: true, searchUrl };
    }

    // Check cache
    const cacheKey = `oer_${keyword ?? ''}_${subject ?? ''}_${grade ?? ''}`;
    const cached = await getCachedData(source, cacheKey);
    if (cached) return cached as OerResponse;

    const apiUrl = `https://www.oercommons.org/api/search?${searchParams.toString()}`;
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OER Commons API responded with status ${response.status}`);
    }

    const raw = await response.json();
    const items = raw?.results ?? raw?.items ?? [];

    const results: OerResult[] = items.slice(0, 15).map((item: any) => ({
      title: item.title ?? 'Untitled Resource',
      description: (item.abstract ?? item.description ?? '').substring(0, 200),
      author: item.author ?? item.provider ?? 'Unknown',
      license: item.license ?? 'CC BY',
      url: item.url ?? item.link ?? '#',
    }));

    const result: OerResponse = { results };
    await setCachedData(source, cacheKey, result, 6);
    await incrementRequestCount(source);

    return result;
  } catch (err: any) {
    const message = 'Unable to search OER Commons right now.';
    await recordApiError(source, err?.message ?? message);
    return { error: true, message };
  }
}

// ─── Data.gov Functions ────────────────────────────────────────

/**
 * Search Data.gov for public datasets.
 * No API key required.
 */
export async function searchDataGov(
  query: string,
  perPage = 5
): Promise<DataGovResponse> {
  const source = 'data_gov';
  try {
    const enabled = await isApiEnabled(source);
    if (!enabled) {
      return { error: true, message: 'Data.gov search is currently disabled by your administrator.', results: [] };
    }

    const cacheKey = `datagov_${query}_${perPage}`;
    const cached = await getCachedData(source, cacheKey);
    if (cached) return cached as DataGovResponse;

    const url = `https://catalog.data.gov/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=${perPage}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Data.gov API responded with status ${response.status}`);
    }

    const raw = await response.json();
    const packages = raw?.result?.results ?? [];

    const results: DataGovResult[] = packages.map((pkg: any) => ({
      title: pkg.title ?? 'Untitled Dataset',
      description: (pkg.notes ?? '').substring(0, 300),
      publisher: pkg.organization?.title ?? 'U.S. Government',
      keywords: (pkg.tags ?? []).map((t: any) => t.display_name ?? t.name).slice(0, 8),
      landingPage: pkg.url ?? `https://catalog.data.gov/dataset/${pkg.name ?? pkg.id}`,
    }));

    const result: DataGovResponse = { results };
    await setCachedData(source, cacheKey, result, 12);
    await incrementRequestCount(source);

    return result;
  } catch (err: any) {
    const message = 'Unable to search Data.gov right now.';
    await recordApiError(source, err?.message ?? message);
    return { error: true, message, results: [] };
  }
}

// ─── Europeana Functions ───────────────────────────────────────

/**
 * Search Europeana for openly-licensed cultural heritage content.
 * Requires a wskey stored in api_settings.
 */
export async function searchEuropeana(
  query: string,
  rows = 12
): Promise<EuropeanaResponse> {
  const source = 'europeana';
  try {
    const enabled = await isApiEnabled(source);
    if (!enabled) {
      return { error: true, message: 'Europeana search is currently disabled by your administrator.' };
    }

    const key = await getApiKey(source);
    if (!key) {
      const searchUrl = `https://www.europeana.eu/en/search?query=${encodeURIComponent(query)}`;
      return { fallback: true, searchUrl };
    }

    const cacheKey = `europeana_${query}_${rows}`;
    const cached = await getCachedData(source, cacheKey);
    if (cached) return cached as EuropeanaResponse;

    const url = `https://api.europeana.eu/record/v2/search.json?wskey=${encodeURIComponent(key)}&query=${encodeURIComponent(query)}&rows=${rows}&media=true&thumbnail=true&reusability=open`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Europeana API responded with status ${response.status}`);
    }

    const raw = await response.json();
    const rawItems = raw?.items ?? [];

    const items: EuropeanaItem[] = rawItems.map((item: any) => ({
      id: item.id ?? '',
      title: (item.title ?? ['Untitled'])[0],
      description: ((item.dcDescription ?? item.dcDescriptionLangAware?.en ?? [''])[0] ?? '').substring(0, 250),
      thumbnail: item.edmPreview?.[0] ?? '',
      provider: (item.provider ?? ['Europeana'])[0],
      dataProvider: (item.dataProvider ?? ['Unknown'])[0],
      rights: (item.rights ?? [''])[0],
      edmIsShownAt: (item.edmIsShownAt ?? [''])[0],
    }));

    const result: EuropeanaResponse = { items };
    await setCachedData(source, cacheKey, result, 12);
    await incrementRequestCount(source);

    return result;
  } catch (err: any) {
    const message = 'Unable to search Europeana right now.';
    await recordApiError(source, err?.message ?? message);
    return { error: true, message };
  }
}
