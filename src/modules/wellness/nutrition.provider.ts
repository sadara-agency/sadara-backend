/**
 * Nutritionix API Client
 *
 * Handles food search and nutrient lookup via the Nutritionix v2 API.
 * Rate-limited with exponential backoff retry (follows sportmonks pattern).
 * Results are cached in wellness_food_items for subsequent lookups.
 */

import axios, { type AxiosInstance, type AxiosError } from "axios";
import { env } from "@config/env";
import { logger } from "@config/logger";
import { AppError } from "@middleware/errorHandler";
import { cacheGet, cacheSet, CacheTTL } from "@shared/utils/cache";

const BASE_URL = "https://trackapi.nutritionix.com/v2";
const REQUEST_TIMEOUT = 15_000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;
const SEARCH_CACHE_PREFIX = "nutritionix:search";

export interface NutritionixFood {
  food_name: string;
  brand_name: string | null;
  serving_qty: number;
  serving_unit: string;
  nf_calories: number;
  nf_protein: number;
  nf_total_carbohydrate: number;
  nf_total_fat: number;
  nf_dietary_fiber: number | null;
  nix_item_id: string | null;
  photo: { thumb: string } | null;
}

interface NutritionixSearchResponse {
  common: NutritionixFood[];
  branded: NutritionixFood[];
}

interface NutritionixNutrientsResponse {
  foods: NutritionixFood[];
}

function getCredentials() {
  return {
    appId: env.nutritionix.appId,
    apiKey: env.nutritionix.apiKey,
  };
}

function createClient(): AxiosInstance {
  const { appId, apiKey } = getCredentials();
  return axios.create({
    baseURL: BASE_URL,
    timeout: REQUEST_TIMEOUT,
    headers: {
      "Content-Type": "application/json",
      "x-app-id": appId,
      "x-app-key": apiKey,
    },
  });
}

function isConfigured(): boolean {
  const { appId, apiKey } = getCredentials();
  return !!(appId && apiKey);
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  data?: any,
  params?: Record<string, string | number>,
): Promise<T> {
  if (!isConfigured()) {
    throw new AppError(
      "Nutritionix API is not configured. Set NUTRITIONIX_APP_ID and NUTRITIONIX_API_KEY in environment.",
      500,
    );
  }

  const client = createClient();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await client.request<T>({ method, url: path, data, params });
      return res.data;
    } catch (err) {
      const axErr = err as AxiosError;
      const status = axErr.response?.status;

      if (status === 429) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt);
        logger.warn(
          `[Nutritionix] Rate limited (429). Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await new Promise((r) => setTimeout(r, delay));
        lastError = axErr;
        continue;
      }

      if (status === 401 || status === 403) {
        throw new AppError(
          `Nutritionix authentication failed (${status}). Check your API credentials.`,
          503,
        );
      }

      if (status === 404) {
        throw new AppError(`Nutritionix resource not found: ${path}`, 404);
      }

      throw new AppError(
        `Nutritionix API error: ${axErr.message} (status: ${status ?? "unknown"})`,
        502,
      );
    }
  }

  throw (
    lastError ??
    new AppError("Nutritionix API request failed after retries", 503)
  );
}

// ── Public API ──

/**
 * Search for food items using Nutritionix instant search.
 * Returns both common foods and branded items.
 * Results are cached for 5 minutes.
 */
export async function searchFood(query: string): Promise<NutritionixFood[]> {
  if (!query.trim()) return [];

  // Check cache first
  const cacheKey = `${SEARCH_CACHE_PREFIX}:${query.toLowerCase().trim()}`;
  const cached = await cacheGet<NutritionixFood[]>(cacheKey);
  if (cached) return cached;

  const res = await request<NutritionixSearchResponse>(
    "GET",
    "/search/instant",
    undefined,
    { query: query.trim() },
  );

  // Merge common + branded, limit results
  const foods = [...(res.common || []), ...(res.branded || [])].slice(0, 30);

  // Cache for 5 minutes
  cacheSet(cacheKey, foods, CacheTTL.MEDIUM).catch(() => {});

  return foods;
}

/**
 * Get detailed nutrition info using natural language.
 * E.g., "1 cup rice" or "2 scrambled eggs"
 */
export async function getNutrients(query: string): Promise<NutritionixFood[]> {
  if (!query.trim()) return [];

  const res = await request<NutritionixNutrientsResponse>(
    "POST",
    "/natural/nutrients",
    { query: query.trim() },
  );

  return res.foods || [];
}

/**
 * Check if Nutritionix API is configured and reachable.
 */
export async function testConnection(): Promise<boolean> {
  try {
    if (!isConfigured()) return false;
    await searchFood("apple");
    return true;
  } catch {
    return false;
  }
}

/**
 * Map a Nutritionix food item to our DB schema format.
 */
export function mapToFoodItem(food: NutritionixFood) {
  return {
    externalId: food.nix_item_id || food.food_name,
    source: "nutritionix" as const,
    name: food.food_name,
    brand: food.brand_name,
    servingQty: food.serving_qty,
    servingUnit: food.serving_unit,
    calories: food.nf_calories,
    proteinG: food.nf_protein,
    carbsG: food.nf_total_carbohydrate,
    fatG: food.nf_total_fat,
    fiberG: food.nf_dietary_fiber,
    photoUrl: food.photo?.thumb ?? null,
    isVerified: true,
  };
}
