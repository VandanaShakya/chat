import React, { useEffect, useState, useRef } from "react";
import socket from "../socket.js";
import { logoutUser } from "../api/api.js";
import EmojiPicker from "emoji-picker-react";

function appendDeduped(list, msg) {
  const id = msg?._id != null ? String(msg._id) : null;
  if (!id) return [...list, msg];
  if (list.some((m) => String(m._id) === id)) return list;
  return [...list, msg];
}

function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [messagesByUser, setMessagesByUser] = useState({});
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false); // 🔥 ADDED
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFilePreviewUrl, setSelectedFilePreviewUrl] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedUserRef = useRef(null);

  const HISTORY_API_BASE = `${import.meta.env.VITE_BASE_URL}/message/get`;

  const LAST_SELECTED_USER_KEY = "lastSelectedChatUserId";

  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const currentUserId = currentUser?.id;
  const isMe = (sender) => String(sender) === String(currentUserId);

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
          (u) => String(u._id) !== String(currentUserId)
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

      const s = data?.sender != null ? String(data.sender) : "";
      const r = data?.receiver != null ? String(data.receiver) : "";
      const me = String(currentUserId);
      const otherUserId = s === me ? r : s;

      if (!otherUserId) return;

      setMessagesByUser((prev) => {
        const next = { ...prev };
        const existing = next[otherUserId] || [];
        next[otherUserId] = appendDeduped(existing, data);
        return next;
      });

      const activeUserId = selectedUserRef.current?._id;

      if (activeUserId && activeUserId === otherUserId) {
        setMessages((prev) => appendDeduped(prev, data));
      }
    };

    const onDeleteMessage = (payload) => {
      const rawId = payload?.messageId;
      if (rawId == null) return;
      const idStr = String(rawId);
      setMessages((prev) => prev.filter((m) => String(m._id) !== idStr));
      setMessagesByUser((prev) => {
        const next = { ...prev };
        for (const uid of Object.keys(next)) {
          next[uid] = (next[uid] || []).filter((m) => String(m._id) !== idStr);
        }
        return next;
      });
    };

    socket.on("connect", onConnect);
    socket.on("receive_message", onReceive);
    socket.on("delete_message", onDeleteMessage);

    return () => {
      socket.off("connect", onConnect);
      socket.off("receive_message", onReceive);
      socket.off("delete_message", onDeleteMessage);
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

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (selectedFilePreviewUrl) URL.revokeObjectURL(selectedFilePreviewUrl);
    };
  }, [selectedFilePreviewUrl]);

  // 📤 SEND MESSAGE
  const sendMessage = async () => {
    if (!selectedUser) return;
    const text = message.trim();
    if (!text && !selectedFile) return;
    const fileToSend = selectedFile;
    const previewUrl = selectedFilePreviewUrl;
    const targetUserId = selectedUser._id;
    const optimisticId = `tmp-${Date.now()}`;

    const optimisticMessage = {
      _id: optimisticId,
      sender: currentUserId,
      receiver: targetUserId,
      message: text || "",
      imageUrl: previewUrl || "",
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
    setSelectedFile(null);
    setSelectedFilePreviewUrl("");

    // 🔥 Show AI typing immediately
    if (selectedUser.isAI) {
      setIsTyping(true);
    }

    try {
      const form = new FormData();
      if (text) form.append("message", text);
      if (fileToSend) form.append("image", fileToSend);

      const res = await fetch(
        `${import.meta.env.VITE_BASE_URL}/message/send/${targetUserId}`,
        {
          method: "POST",
          credentials: "include",
          body: form,
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to send message");

      if (selectedUser.isAI) {
        // AI reply is also pushed via socket; dedupe so it never appears twice
        setMessages((prev) => appendDeduped(prev, data));
        setMessagesByUser((prev) => {
          const next = { ...prev };
          const existing = next[targetUserId] || [];
          next[targetUserId] = appendDeduped(existing, data);
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

  // emoji sending //
  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
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
            className={`p-3 mb-2 rounded cursor-pointer ${selectedUser?._id === user._id
                ? "bg-blue-500 text-white"
                : "bg-gray-200 hover:bg-gray-300"
              }`}
          >
            {user.userName}
            {user.isAI && "🤖"} {/* 🔥 SHOW AI */}
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
              key={msg._id != null ? String(msg._id) : `idx-${index}`}
              className={`flex ${isMe(msg.sender)
                  ? "justify-end"
                  : "justify-start"
                }`}
            >
              <div
                className={`px-4 py-2 rounded-lg max-w-[70%] ${isMe(msg.sender)
                    ? "bg-blue-500 text-white"
                    : "bg-gray-300 text-black"
                  }`}
              >
                {!!msg.message && <div className="whitespace-pre-wrap">{msg.message}
                  </div>}

                {!!msg.imageUrl && (
                  <a
                    href={msg.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block mt-2"
                  >
                    <img
                      src={msg.imageUrl}
                      alt="attachment"
                      className="max-w-full max-h-64 rounded object-cover"
                      loading="lazy"
                    />
                  </a>
                )}
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

        <div className="flex flex-col border-t bg-white relative">
          {(selectedFile || selectedFilePreviewUrl) && (
            <div className="flex items-start gap-3 px-3 pt-3 pb-2 border-b border-gray-200 bg-gray-50">
              <div className="relative inline-block">
                {selectedFilePreviewUrl ? (
                  <img
                    src={selectedFilePreviewUrl}
                    alt="Preview"
                    className="max-h-40 max-w-[min(100%,280px)] rounded-lg border border-gray-200 object-cover shadow-sm"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-lg bg-gray-200 flex items-center justify-center text-sm text-gray-500">
                    Image
                  </div>
                )}
                <button
                  type="button"
                  aria-label="Remove attachment"
                  onClick={() => {
                    if (selectedFilePreviewUrl) URL.revokeObjectURL(selectedFilePreviewUrl);
                    setSelectedFile(null);
                    setSelectedFilePreviewUrl("");
                  }}
                  className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-gray-800 text-white text-lg leading-7 shadow hover:bg-gray-700"
                >
                  ×
                </button>
              </div>
              <span className="text-sm text-gray-500 pt-1">
                {selectedFile?.name || "Add a caption, then send"}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 p-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setSelectedFile(file);

                if (selectedFilePreviewUrl) URL.revokeObjectURL(selectedFilePreviewUrl);
                setSelectedFilePreviewUrl(file ? URL.createObjectURL(file) : "");

                e.target.value = "";
              }}
            />

            <button
              type="button"
              title="Attach image"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 px-2 py-2 text-xl hover:bg-gray-100 rounded"
            >
              📎
            </button>

            <button type="button" onClick={() => setShowPicker(!showPicker)} className="shrink-0 px-2 py-2 text-xl hover:bg-gray-100 rounded">
              😊
            </button>

            {showPicker && (
              <div className="absolute bottom-14 left-4 z-10">
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </div>
            )}

            <input
              type="text"
              className="flex-1 p-3 outline-none min-w-0"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <button
              type="button"
              onClick={sendMessage}
              className="shrink-0 bg-blue-500 text-white px-4 py-2 rounded"
            >
              Send
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Chat;
