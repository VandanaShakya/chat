import React, { useState } from "react";
import { loginUser } from "../api/api.js";
import { Link } from "react-router-dom"; // ✅ import Link

function Login() {
  const [form, setForm] = useState({
    email: "",  
    password: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const res = await loginUser(form);
    if (!res) {
      alert("Login failed (no response). Check backend and CORS.");
      return;
    }

    const user = res?.user;
    if (!user) {
      alert(res?.message || "Login failed");
      return;
    }

    localStorage.setItem("user", JSON.stringify(user));

    // Token is optional: backend also sets an httpOnly cookie used by API + socket auth.
    if (typeof res.token === "string" && res.token.trim().length > 0) {
      localStorage.setItem("token", res.token);
    } else {
      localStorage.removeItem("token");
    }

    window.location.href = "/chat";
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded shadow w-80 space-y-3">
        <h2 className="text-xl font-bold">Login</h2>

        <input
          name="email"
          placeholder="Email"
          onChange={handleChange}
          className="w-full border p-2"
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
          className="w-full border p-2"
        />

        <button
          onClick={handleSubmit}
          className="w-full bg-green-500 text-white p-2"
        >
          Login
        </button>

        {/* ✅ Signup Link Added */}
        <p className="text-center text-sm">
          Don't have an account?{" "}
          <Link to="/signup" className="text-blue-500 underline">
            Signup
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Login;