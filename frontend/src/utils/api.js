// import axios from "axios";

// const axiosApi = axios.create({
//   baseURL: import.meta.env.VITE_API_URL,
//   withCredentials: true,
//   timeout: 60000,
// });

// export default axiosApi 



import axios from "axios";

const axiosApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 60000,
});


let isRefreshing = false;
let failedQueue = [];

// This function safely handles both Success AND Error for the queue
const processQueue = (error) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

axiosApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if the requested URL is a public or auth-check route
    const isPublicOrAuthCheck =
      // originalRequest.url.includes("/auth/me") ||
      originalRequest.url.includes("/auth/login") ||
      originalRequest.url.includes("/auth/register") ||
      originalRequest.url.includes("/auth/forgot_password") ||
      originalRequest.url.includes("/auth/reset_password") ||
      originalRequest.url.includes("/refresh_token") ||
      originalRequest.url.includes("/logout") ||
      originalRequest.url.includes("/links/access") ||
      originalRequest.url.includes("/links/verify_password");

    // only handle 401 for protected routes (skip if retried or public/auth-check)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublicOrAuthCheck
    ) {

      // If a refresh is already in progress, safely queue this request
      if (isRefreshing) {
        originalRequest._retry = true; // mark queued requests too, so they don't re-enter this block
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosApi(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // MUST MATCH YOUR BACKEND ROUTE! (GET request to /users/refresh_token)
        await axiosApi.get("/auth/refresh_token");

        isRefreshing = false;
        processQueue(null); // Tell the queue it was successful

        return axiosApi(originalRequest);

      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError); // Tell the queue it failed so they don't freeze

        //  auto logged out if servern return the 401
        const status = refreshError.response?.status;
        if (status === 401 || status === 403) {
          window.dispatchEvent(new Event("auth-expired"));
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosApi;