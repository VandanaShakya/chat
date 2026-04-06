import mongoose from "mongoose";

const messegeSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.Mixed,
        ref: "chat_user"
    },
    receiver: {
        type: mongoose.Schema.Types.Mixed,
        ref: "chat_user"
    },
    message: {
        type: String,
        required: true
    }
})

const Messege = mongoose.model("chat_messege",messegeSchema);
export default Messege;