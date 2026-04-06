import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// ✅ Signup
export const signupUser = async (data) => {
  try {
    const res = await axios.post(
      `${BASE_URL}/auth/signup`,
      data,
      {
        withCredentials: true
      }
    );
    return res.data;
  } catch (error) {
    console.log("Signup Error:", error.response?.data || error.message);
    return error.response?.data;
  }
};

// ✅ Login
export const loginUser = async (data) => {
  try {
    const res = await axios.post(
      `${BASE_URL}/auth/login`,
      data,
      {
        withCredentials: true // 🔥 required for cookie
      }
    );
    return res.data;
  } catch (error) {
    console.log("Login Error:", error.response?.data || error.message);
    return error.response?.data;
  }
};

// ✅ Logout
export const logoutUser = async () => {
    const res = await axios.post(
      `${BASE_URL}/auth/logout`,
      {},
      { withCredentials: true }
    );
    return res.data;
};