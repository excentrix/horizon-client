import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import Cookies from "js-cookie";

const resolveDevApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (process.env.NODE_ENV !== "development") {
    return undefined;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    return `${protocol}//${host}:8000/api`;
  }

  return "http://127.0.0.1:8000/api";
};

const API_BASE_URL = resolveDevApiBaseUrl();
const REFRESH_ENDPOINT =
  process.env.NEXT_PUBLIC_AUTH_REFRESH_ENDPOINT ?? "/auth/token/refresh/";
const REMEMBER_SESSION_COOKIE = "authRemember";

type RefreshResponse = {
  access_token?: string;
  access?: string;
  refresh_token?: string;
  refresh?: string;
};

const isRememberedSession = () => Cookies.get(REMEMBER_SESSION_COOKIE) === "1";

const getSessionCookieOptions = (remember = isRememberedSession()) => ({
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  ...(remember ? { expires: 14 } : {}),
});

export const setClientSessionTokens = (
  access?: string,
  refresh?: string,
  remember = isRememberedSession(),
) => {
  const cookieOptions = getSessionCookieOptions(remember);

  if (remember) {
    Cookies.set(REMEMBER_SESSION_COOKIE, "1", cookieOptions);
  } else {
    Cookies.remove(REMEMBER_SESSION_COOKIE);
  }

  if (access) {
    Cookies.set("accessToken", access, cookieOptions);
  }
  if (refresh) {
    Cookies.set("refreshToken", refresh, cookieOptions);
  }
};

export const clearSessionTokens = () => {
  Cookies.remove("accessToken");
  Cookies.remove("refreshToken");
  Cookies.remove(REMEMBER_SESSION_COOKIE);
};

const resolveRefreshUrl = () => {
  if (/^https?:\/\//i.test(REFRESH_ENDPOINT)) {
    return REFRESH_ENDPOINT;
  }

  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL must be configured in non-development environments");
  }

  const endpoint = REFRESH_ENDPOINT.startsWith("/")
    ? REFRESH_ENDPOINT
    : `/${REFRESH_ENDPOINT}`;
  return `${API_BASE_URL}${endpoint}`;
};

export const refreshSessionTokens = async () => {
  const hadAccessToken = Boolean(Cookies.get("accessToken"));
  const refreshToken = Cookies.get("refreshToken") ?? Cookies.get("refresh");

  if (!refreshToken) {
    return null;
  }

  const { data } = await axios.post<RefreshResponse>(
    resolveRefreshUrl(),
    { refresh: refreshToken },
  );

  const accessToken = data.access_token ?? data.access;
  const nextRefreshToken = data.refresh_token ?? data.refresh;

  if (!accessToken) {
    return null;
  }

  setClientSessionTokens(
    accessToken,
    nextRefreshToken,
    isRememberedSession() || !hadAccessToken,
  );

  return {
    accessToken,
    refreshToken: nextRefreshToken ?? refreshToken,
  };
};

interface FailedRequest {
  resolve: (value: AxiosResponse) => void;
  reject: (reason?: unknown) => void;
  config: AxiosRequestConfig & { _retry?: boolean };
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const queueRequest = (config: FailedRequest["config"]) =>
  new Promise<AxiosResponse>((resolve, reject) => {
    failedQueue.push({ resolve, reject, config });
  });

const processQueue = (
  error: AxiosError | null,
  token: string | null,
  http: AxiosInstance,
) => {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
      return;
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    http(config)
      .then(resolve)
      .catch(reject);
  });

  failedQueue = [];
};

const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL ?? "",
});

http.interceptors.request.use((config) => {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL must be configured in non-development environments");
  }
  const headers = AxiosHeaders.from(config.headers ?? {});
  config.headers = headers;
  const token = Cookies.get("accessToken");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // DRF's SupabaseAuthentication has no WWW-Authenticate header, so a missing/
    // expired token comes back as 403 "Authentication credentials were not provided"
    // — not 401. Treat that as an auth failure too, while letting genuine
    // permission-denied 403s pass through untouched.
    const status = error.response?.status;
    const detail = String(
      (error.response?.data as { detail?: string; code?: string } | undefined)?.detail ??
        (error.response?.data as { detail?: string; code?: string } | undefined)?.code ??
        "",
    );
    const isAuthFailure =
      status === 401 ||
      (status === 403 && /not_authenticated|credentials were not provided|not valid|token/i.test(detail));

    if (isAuthFailure && !originalRequest._retry) {
      if (isRefreshing) {
        return queueRequest(originalRequest);
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshedSession = await refreshSessionTokens();
        if (!refreshedSession?.accessToken) {
          throw error;
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${refreshedSession.accessToken}`;
        }

        processQueue(null, refreshedSession.accessToken, http);

        return http(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null, http);
        clearSessionTokens();
        // Session is truly dead — send the user to login instead of leaving
        // them on a page firing silent 403s.
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export { http };
