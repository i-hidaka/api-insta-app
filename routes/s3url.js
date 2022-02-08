var express = require("express");
var router = express.Router();
var { generateUploadURL } = require("./s3");

// ローカルのときは3000番　http://localhost:3000
// デプロイ先　https://api-instagram-app.herokuapp.com/
// const mongoose = require("mongoose");

// mongoose.connect(
//   // .envファイルから環境変数をもってくる「process.env.設定したkey」で使用（デプロイしたらそこで環境変数新たに設定）
//   `mongodb+srv://${process.env.NAME}:${process.env.PASS}@cluster0.xkm6r.mongodb.net/instagram?retryWrites=true&w=majority`,
//   () => {
//     console.log("mongoDBに接続しました");
//   }
// );

router.get("/", async (req, res) => {
  const url = await generateUploadURL();
  res.send({ url });
});

module.exports = router;
