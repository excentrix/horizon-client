import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import Cookies from "js-cookie";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";
const REFRESH_ENDPOINT = process.env.NEXT_PUBLIC_AUTH_REFRESH_ENDPOINT;

type RefreshResponse = {
  access_token?: string;
  access?: string;
  refresh_token?: string;
  refresh?: string;
};

const clearSessionTokens = () => {
  Cookies.remove("accessToken");
  Cookies.remove("refreshToken");
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
  baseURL: API_BASE_URL,
});

http.interceptors.request.use((config) => {
  const url = config.url ?? "";
  const isAuthRoute = url.includes("/auth/login/") || url.includes("/auth/register/");
  if (isAuthRoute) {
    return config;
  }
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

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (!REFRESH_ENDPOINT) {
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return queueRequest(originalRequest);
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken =
          Cookies.get("refreshToken") ?? Cookies.get("refresh");

        if (!refreshToken) {
          throw error;
        }

        const { data } = await axios.post<RefreshResponse>(
          `${API_BASE_URL}${REFRESH_ENDPOINT}`,
          { refresh: refreshToken },
        );

        const newAccessToken =
          data.access_token ?? data.access ?? Cookies.get("accessToken");

        if (!newAccessToken) {
          throw error;
        }

        Cookies.set("accessToken", newAccessToken);
        const nextRefreshToken = data.refresh_token ?? data.refresh;
        if (nextRefreshToken) {
          Cookies.set("refreshToken", nextRefreshToken);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken, http);

        return http(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null, http);
        clearSessionTokens();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export { http };
