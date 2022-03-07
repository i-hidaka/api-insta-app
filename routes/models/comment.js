var mongoose = require("mongoose");

const commentSchema = mongoose.Schema({
  commentId: Number,
  postId: Number,
  userId: Number,
  comment: String,
  commentDate: Date,
});
module.exports = mongoose.model("comments", commentSchema);
