import React, { useEffect, useState, useRef } from "react";
import socket from "../socket.js";
import { logoutUser } from "../api/api.js";

function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [messagesByUser, setMessagesByUser] = useState({});
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false); // 🔥 ADDED

  const bottomRef = useRef(null);
  const selectedUserRef = useRef(null);

   const HISTORY_API_BASE = `${import.meta.env.VITE_BASE_URL}/message/get`;

  const LAST_SELECTED_USER_KEY = "lastSelectedChatUserId";

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const currentUserId = currentUser?.id;

  // 🔥 Fetch users (AI included automatically)
  useEffect(() => {
    fetch(`${import.meta.env.VITE_BASE_URL}/message/users`, 
      {
        credentials: "include"
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;

        const filteredUsers = data.filter(
          (u) => u._id !== currentUserId
        );

        setUsers(filteredUsers);
      });
  }, [currentUserId]);

  // Restore last selected user
  useEffect(() => {
    if (!users?.length) return;
    if (selectedUser?._id) return;

    const lastId = localStorage.getItem(LAST_SELECTED_USER_KEY);
    if (!lastId) return;

    const found = users.find((u) => u._id === lastId);
    if (found) setSelectedUser(found);
  }, [users, selectedUser]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  // 🔌 Socket
  useEffect(() => {
    const onConnect = () => {
      console.log("✅ Socket connected:", socket.id);
    };

    const onReceive = (data) => {
      console.log("📩 Received:", data);

      // 🔥 Stop typing when AI reply comes
      if (selectedUserRef.current?.isAI) {
        setIsTyping(false);
      }

      const otherUserId =
        data?.sender === currentUserId ? data?.receiver : data?.sender;

      if (!otherUserId) return;

      setMessagesByUser((prev) => {
        const next = { ...prev };
        const existing = next[otherUserId] || [];
        next[otherUserId] = [...existing, data];
        return next;
      });

      const activeUserId = selectedUserRef.current?._id;

      if (activeUserId && activeUserId === otherUserId) {
        setMessages((prev) => [...prev, data]);
      }
    };

    socket.on("connect", onConnect);
     socket.on("receive_message", onReceive);

    return () => {
      socket.off("connect", onConnect);
      socket.off("receive_message", onReceive);
    };
  }, [currentUserId]);

  // 🔥 Fetch history
  useEffect(() => {
    if (!selectedUser?._id) return;

    const cached = messagesByUser[selectedUser._id];
    if (cached) {
      setMessages(cached);
      return;
    }

    fetch(`${HISTORY_API_BASE}/${selectedUser._id}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setMessages(list);

        setMessagesByUser((prev) => ({
          ...prev,
          [selectedUser._id]: list,
        }));
      })
      .catch(() => setMessages([]));
  }, [selectedUser]);

  // 🔽 Scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]); // 🔥 include typing

  // 📤 SEND MESSAGE
  const sendMessage = async () => {
    if (!message.trim() || !selectedUser) return;
    const text = message.trim();
    const targetUserId = selectedUser._id;
    const optimisticId = `tmp-${Date.now()}`;

    const optimisticMessage = {
      _id: optimisticId,
      sender: currentUserId,
      receiver: targetUserId,
      message: text,
      createdAt: new Date().toISOString(),
      __optimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setMessagesByUser((prev) => {
      const next = { ...prev };
      const existing = next[targetUserId] || [];
      next[targetUserId] = [...existing, optimisticMessage];
      return next;
    });
    setMessage("");

    // 🔥 Show AI typing immediately
    if (selectedUser.isAI) {
      setIsTyping(true);
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BASE_URL}/message/send/${targetUserId}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ message: text })
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to send message");

      if (selectedUser.isAI) {
        // AI endpoint returns only AI reply; keep optimistic user message and append AI response
        setMessages((prev) => [...prev, data]);
        setMessagesByUser((prev) => {
          const next = { ...prev };
          const existing = next[targetUserId] || [];
          next[targetUserId] = [...existing, data];
          return next;
        });
      } else {
        // Normal endpoint returns sender message; replace optimistic item with DB item
        setMessages((prev) =>
          prev.map((msg) => (msg._id === optimisticId ? data : msg))
        );
        setMessagesByUser((prev) => {
          const next = { ...prev };
          const existing = next[targetUserId] || [];
          next[targetUserId] = existing.map((msg) =>
            msg._id === optimisticId ? data : msg
          );
          return next;
        });
      }
    } catch (error) {
      setIsTyping(false);
      // Roll back optimistic message if send fails
      setMessages((prev) => prev.filter((msg) => msg._id !== optimisticId));
      setMessagesByUser((prev) => {
        const next = { ...prev };
        const existing = next[targetUserId] || [];
        next[targetUserId] = existing.filter((msg) => msg._id !== optimisticId);
        return next;
      });
      console.log(error.message);
    }
  };

  const logout = () => {
    logoutUser()
      .then((data) => console.log(data.message))
      .catch(console.log);

    localStorage.removeItem("user");
    localStorage.removeItem(LAST_SELECTED_USER_KEY);
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen bg-gray-100">

      {/* 👥 USERS */}
      <div className="w-1/3 bg-white p-4 border-r overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Users</h2>

        {users.map((user) => (
          <div
            key={user._id}
            onClick={() => {
              setSelectedUser(user);
              localStorage.setItem(LAST_SELECTED_USER_KEY, user._id);
            }}
            className={`p-3 mb-2 rounded cursor-pointer ${
              selectedUser?._id === user._id
                ? "bg-blue-500 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {user.userName}
            {user.isAI && " 🤖"} {/* 🔥 SHOW AI */}
          </div>
        ))}

        <button
          onClick={logout}
          className="bg-red-500 text-white p-2 rounded-md"
        >
          Logout
        </button>
      </div>

      {/* 💬 CHAT */}
      <div className="w-2/3 flex flex-col">

        <div className="p-4 border-b font-semibold">
          {selectedUser
            ? `Chat with ${selectedUser.userName}`
            : "Select a user"}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.sender === currentUser.id
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`px-4 py-2 rounded-lg max-w-[70%] ${
                  msg.sender === currentUser.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-300 text-black"
                }`}
              >
                {msg.message}
              </div>
            </div>
          ))}

          {/* 🔥 AI typing indicator */}
          {isTyping && (
            <div className="text-gray-500 text-sm">
              🤖 AI is typing...
            </div>
          )}

          <div ref={bottomRef}></div>
        </div>

        <div className="flex border-t">
          <input
            type="text"
            className="flex-1 p-3 outline-none"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4"
          >
            Send
          </button>
        </div>

      </div>
    </div>
  );
}

export default Chat;