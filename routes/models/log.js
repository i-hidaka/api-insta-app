var mongoose = require("mongoose");

const logSchema = mongoose.Schema({
  logId: Number,
  type: String,
  contents: Object,
  date: Date,
  informUserId: Number,
  checked: Boolean,
});
module.exports = mongoose.model("logs", logSchema);
