var mongoose = require("mongoose");

const userSchema = mongoose.Schema({
    userId: Number,
    userName: String,
    password: String,
    follow: Array,
    follower: Array,
    icon: String,
    bio: String,
  });

module.exports=mongoose.model("users",userSchema)