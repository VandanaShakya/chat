import mongoose from "mongoose";
 
const userSchema = new mongoose.Schema({
    name: {
        type: String
    },
    userName:{
        type: String,
        required: true,
        unique: true
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required: true
    },
    createdAt:{
        type: Date,
        default: Date.now
    },
    isAI: {
        type: Boolean,
        default: false
      },
    
}, {timestamps: true})

const User = mongoose.model("chat_user",userSchema);
export default User;