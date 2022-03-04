var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var indexRouter = require("./routes/instagram");
var s3urlRouter = require("./routes/s3url");

const cors = require("cors");
var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

// CORSを有効化;
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/s3url", s3urlRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});
//  mongoDBに接続
mongoose.connect(
  // .envファイルから環境変数をもってくる「process.env.設定したkey」で使用（デプロイしたらそこで環境変数新たに設定）
  `mongodb+srv://${process.env.NAME}:${process.env.PASS}@cluster0.xkm6r.mongodb.net/instagram?retryWrites=true&w=majority`,
  () => {
    console.log("mongoDBに接続しました");
  }
);
var Rollbar = require("rollbar");
var rollbar = new Rollbar({
  accessToken: 'b6367355d50a4f21a383a9750245311c',
  captureUncaught: true,
  captureUnhandledRejections: true
});

// record a generic message and send it to Rollbar
rollbar.log("Hello world!");

module.exports = app;
