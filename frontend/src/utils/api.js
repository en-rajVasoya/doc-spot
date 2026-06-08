import axios from "axios";


console.log("API URL:", import.meta.env.VITE_API_URL)
const axiosApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 60000, 
});

export default axiosApi 