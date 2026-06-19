const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: [true, "Username already taken!!"],
        require: true,
    },

    email: {
        type: String,
        unique: [true, "Account already exist with this email address!!"],
        require: true,
    },

    password: {
        type: String,
        require: true,
    }
})

const uesrModel = mongoose.model("users", userSchema);

module.exports = uesrModel;