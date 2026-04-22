import React, { useState } from "react";
import { useNavigate } from "react-router"
import { signupUser } from "../api/api.js";

function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    userName: "",
    email: "",
    password: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const res = await signupUser(form);
    if (!res) {
      alert("Signup failed (no response). Check backend and CORS.");
      return;
    }

    const user = res?.user;
    if (!user) {
      alert(res?.message || "Signup failed");
      return;
    }
    navigate("/chat");
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded shadow w-80 space-y-3">
        <h2 className="text-xl font-bold">Signup</h2>

        <input
          name="userName"
          placeholder="Username"
          onChange={handleChange}
          className="w-full border p-2"
        />

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
          className="w-full bg-blue-500 text-white p-2"
        >
          Signup
        </button>
      </div>
    </div>
  );
}
}

export default Signup