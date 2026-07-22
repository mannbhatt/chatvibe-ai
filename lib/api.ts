import { supabase } from './supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("Missing EXPO_PUBLIC_API_BASE_URL environment variable. All API calls must use a deployed backend URL.");
}

if (__DEV__) {
  console.log(`API Base URL: ${API_BASE_URL}`);
}

const DEFAULT_TIMEOUT = 120000;
const MAX_RETRIES = 2;

export interface ApiFetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

export class ApiError extends Error {
  status: number;
  endpoint: string;

  constructor(message: string, status: number, endpoint: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.endpoint = endpoint;
  }
}

const getErrorMessageForStatus = (status: number, fallbackError: string): string => {
  if (fallbackError && fallbackError.trim() !== '') return fallbackError;
  
  switch (status) {
    case 400: return "Bad Request: Please check your input.";
    case 401: return "Unauthorized: Please log in again.";
    case 403: return "Forbidden: You don't have permission to access this.";
    case 404: return "Not Found: The requested feature doesn't exist.";
    case 429: return "Daily Limit Reached 🚀: You have used all free generations for today!";
    case 500: return "Server Error: Our AI is currently taking a break. Please try again later.";
    default: return "An unexpected error occurred.";
  }
};

export const apiFetch = async <T>(
  endpoint: string, 
  options: ApiFetchOptions = {}
): Promise<T> => {
  const { 
    timeout = DEFAULT_TIMEOUT, 
    retries = MAX_RETRIES, 
    method = 'POST',
    headers,
    ...fetchOptions 
  } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.warn(`[API] Retrying ${method} ${url} (Attempt ${attempt + 1}/${retries + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // exponential backoff
      } else {
        console.log(`[API] Request ${method} ${url}`);
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      const defaultHeaders: Record<string, string> = {};
      if (!(fetchOptions.body instanceof FormData)) {
        defaultHeaders['Content-Type'] = 'application/json';
      }

      if (session?.access_token) {
        defaultHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }

      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers: {
          ...defaultHeaders,
          ...headers,
        },
        signal: controller.signal,
        ...fetchOptions,
      });

      clearTimeout(id);

      const responseText = await response.text();
      let data: any;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        data = { error: 'Invalid JSON response from server' };
      }

      if (!response.ok) {
        const friendlyMessage = getErrorMessageForStatus(response.status, data.error || response.statusText);
        
        // 4xx client errors (except 429) shouldn't be retried
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
           throw new ApiError(friendlyMessage, response.status, url);
        }
        
        if (attempt < retries) {
           throw new Error(friendlyMessage); 
        } else {
           throw new ApiError(friendlyMessage, response.status, url);
        }
      }

      console.log(`[API] Response ${method} ${url} - ${response.status}`);
      return data;
    } catch (error: any) {
      console.error(`[API] Error ${method} ${url}:`, error.message);
      
      if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }
      
      if (error.name === 'AbortError') {
         lastError = new ApiError('Request timed out', 408, url);
      } else if (!(error instanceof ApiError)) {
         lastError = new ApiError(error.message || 'Network request failed', 0, url);
      } else {
         lastError = error;
      }
    }
  }

  throw lastError;
};

// Expose api.post and api.get
export const api = {
  get: <T>(endpoint: string, options?: Omit<ApiFetchOptions, 'method'>) => apiFetch<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, data?: any, options?: Omit<ApiFetchOptions, 'method' | 'body'>) => apiFetch<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),
};
