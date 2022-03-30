const { default: axios } = require("axios");
// UTCから変換
const date = new Date().getHours() + 9;
// 9時〜21時に実行
if (date >= 9 && date <= 21) {
  axios.get("https://api-instagram-app.herokuapp.com/postdetail/1");
  console.log("定期実行");
}
