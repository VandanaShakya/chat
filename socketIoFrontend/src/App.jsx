import React from 'react'
import Chat from './components/Chats'
import { Routes, Route } from 'react-router-dom'
import Signup from './components/Signup'
import Login from './components/Login'

const App = () => {
  return (
    <>
     <Routes>

      <Route path="/signup" element={<Signup/>}/>
      <Route path="/" element={<Login/>}/>
      <Route path="/chat" element={<Chat/>}/>
     </Routes>
    </>
  )
}

export default App












// import React, { useState, useEffect } from "react";
  // import { io } from "socket.io-client";
  // import Chats from "./components/Chats";

  // const socket = io("http://localhost:4000");

  // function App() {
  //   const [message, setMessage] = useState("");
  //   const [messageList, setMessageList] = useState([]);

  //   const sendMessage = () => {
  //     socket.emit("send_message", {
  //       senderId: "user1",
  //       receiverId: "user2",
  //       message: message
  //     });
  //   };  

  //   // ✅ FIX HERE
  //   useEffect(() => {
  //     socket.emit("join", "user1"); // 👈 change per user
  //   }, []);

  //   return (
  //    <>
  //     <div>
  //       <h1>Chat App</h1>

  //       <input
  //         type="text"
  //         onChange={(e) => setMessage(e.target.value)}
  //       />
  //       <button onClick={sendMessage}>Send</button>
    
  //       {messageList.map((msg, i) => (
  //   <p key={i}>
  //     {msg.senderId === "user1" ? "You" : "Other"}: {msg.message}
  //   </p>
  // ))}
  //     </div>
  //     <Chats />
  //    </>
  //   );
  // }

  // export default App;