var mongoose = require("mongoose");

const postSchema = mongoose.Schema({
    postId: Number,
    userId: Number,
    imageUrl: Array,
    caption: String,
    prefecture: Object,
    postData: Date,
    favorites: Array,
  });

  module.exports=mongoose.model("posts", postSchema)