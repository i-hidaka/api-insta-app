var express = require("express");
var router = express.Router();
// ローカルのときは3000番　http://localhost:3000
// デプロイ先　https://api-instagram-app.herokuapp.com/
const mongoose = require("mongoose");

// 環境変数を受けとる
require("dotenv").config();
// mongoDBに接続
mongoose.connect(
  // .envファイルから環境変数をもってくる「process.env.設定したkey」で使用（デプロイしたらそこで環境変数新たに設定）
  `mongodb+srv://${process.env.NAME}:${process.env.PASS}@cluster0.xkm6r.mongodb.net/instagram?retryWrites=true&w=majority`,
  () => {
    console.log("mongoDBに接続しました");
  }
);

const userSchema = mongoose.Schema({
  userId: Number,
  userName: String,
  password: String,
  follow: Array,
  follower: Array,
  icon: String,
  bio: String,
});
// 会員登録する
router.post("/register", function (req, res) {
  const registermodel = mongoose.model("users", userSchema);
  //   全件取得した後、一番最後のIDを取得（自動採番）
  registermodel.find({}, function (err, result) {
    const register = new registermodel();
    // 配列の一番最後のID番号に＋1
    register.userId = result[result.length - 1].userId + 1;
    register.userName = req.body.userName;
    register.password = req.body.password;
    register.follow = [];
    register.follower = [];
    register.icon = "";
    register.bio = "";

    registermodel.find(
      { userName: req.body.userName },
      function (err, nameResult) {
        if (nameResult.length === 0) {
          register.save();
          res.send({
            status: "success",
            data: {
              userId: register.userId,
              userName: register.userName,
              password: register.password,
              follow: register.follow,
              follower: register.follower,
              icon: register.icon,
              bio: register.bio,
            },
            message: "会員登録成功",
          });
        } else {
          //  アドレスが既に登録済みの場合はエラーにする
          res.send({
            status: "error",
            data: req.body,
            message: "そのユーザーネームは既に登録済みです",
          });
        }
      }
    );
  });
});

// ログイン
router.post("/login", function (req, res) {
  const registermodel = mongoose.model("users", userSchema);
  registermodel.find(
    { userName: req.body.userName, password: req.body.password },
    function (err, result) {
      if (result.length === 0) {
        res.send({
          status: "error",
          data: req.body,
          message: "ユーザー名とパスワードが一致しません",
        });
      } else {
        res.send({
          status: "success",
          data: {
            userId: result[0].userId,
            userName: result[0].userName,
            password: result[0].password,
            follow: result[0].follow,
            follower: result[0].follower,
            icon: result[0].icon,
            bio: result[0].bio,
          },
        });
      }
    }
  );
});

const postSchema = mongoose.Schema({
  postId: Number,
  userId: Number,
  imgUrl: String,
  caption: String,
  prefecture: String,
  postData: Date,
  favorite: Array,
});
// 投稿する
router.post("/post", function (req, res) {
  const postmodel = mongoose.model("posts", postSchema);
  const post = new postmodel();
  postmodel.find({}, function (err, result) {
    post.postId = result[result.length - 1].postId + 1;
    post.userId = req.body.userId;
    post.imgUrl = req.body.imgUrl;
    post.caption = req.body.caption;
    post.prefecture = req.body.prefecture;
    post.postData = new Date();
    post.favorite = [];
    post.save();
    res.send({
      status: "success",
      data: {
        postId: post.postId,
        userId: post.userId,
        imgUrl: post.imgUrl,
        caption: post.caption,
        prefecture: post.prefecture,
        postData: post.postData,
        favorite: post.favorite,
      },
    });
  });
});

const commentSchema = mongoose.Schema({
  commentId: Number,
  postId: Number,
  userID: Number,
  comment: String,
  commentDate: Date,
});
// コメントする
router.post("/comment", function (req, res) {
  const commentmodel = mongoose.model("comments", commentSchema);
  const comment = new commentmodel();
  commentmodel.find({}, function (error, result) {
    comment.commentId = result[result.length - 1].commentId + 1;
    comment.postId = req.body.postId;
    comment.userId = req.body.userId;
    comment.comment = req.body.comment;
    comment.commentDate = new Date();
    comment.save();
    res.send({
      status: "success",
      data: {
        commentId: comment.commentId,
        postId: comment.postId,
        userId: comment.userId,
        comment: comment.comment,
        commentDate: comment.commentDate,
      },
    });
  });
});

// Home画面でフォローしてる人の投稿取得
router.get("/home/:id", function (req, res) {
  const usermodel = mongoose.model("users", userSchema);
  const postmodel = mongoose.model("posts", postSchema);
  const commentmodel = mongoose.model("comments", commentSchema);
  let userDate = new Object();
  let postDates = [];
  let followUserDates = [];
  let commentDate = [];
  //   自分のデータ取得
  async function getMyDate() {
    await usermodel
      .find({ userId: req.params.id })
      .exec()
      .then((userResult) => {
        userDate = userResult[0];
      });
  }
  // 自分のフォローしてる人の投稿取得
  async function getPost() {
    for (let follow of userDate.follow) {
      await postmodel
        .find({ userId: follow })
        .exec()
        .then((followResult) => {
          postDates.push(followResult);
        });
    }
  }
  //   フォローしている人の情報取得
  async function getPostUser() {
    await usermodel
      .find({ userId: userDate.follow })
      .exec()
      .then((followUserDateResult) => {
        followUserDates = followUserDateResult;
      });
  }
  // 投稿に紐付いたコメントを取得
  async function getComment() {
    for (let userPosts of postDates) {
      for (let userPost of userPosts) {
        await commentmodel
          .find({ postId: userPost.postId })
          .exec()
          .then((commentResult) => {
            commentDate.push(commentResult);
          });
      }
    }
  }
  //   自分のデータ取得
  getMyDate().then((result) => {
    // 自分のフォローしてる人の投稿取得
    getPost().then((result) => {
      //   console.log(postDate);
      //   フォローしている人の情報取得
      getPostUser().then((result) => {
        // console.log(followUserDate);
        // 投稿に紐付いたコメントを取得
        getComment().then((result) => {
          //   console.log(commentDate);
          for (let userPostDates of postDates) {
            for (let userPostDate of userPostDates) {
              for (let followUserDate of followUserDates) {
                if (userPostDate.userId === followUserDate.userId) {
                }
              }
            }
          }
        });
      });
    });
  });
});
router.post("/setting", function (req, res) {
  const usermodel = mongoose.model("users", userSchema);
  usermodel.find({ userId: req.body.userId }, function (err, result) {
    // 登録した名前と現在の名前が一致（変えていないとき)は保存する
    if (result[0].userName === req.body.userName) {
      result[0].userName = req.body.userName;
      result[0].icon = req.body.icon;
      result[0].bio = req.body.bio;
      result[0].save();
      res.send({ status: "success", data: result[0] });
    } else {
      // ユーザー名が既に存在したら弾く
      usermodel.find(
        { userName: req.body.userName },
        function (err, nameResult) {
          if (nameResult.length >= 1) {
            res.send({
              status: "error",
              data: req.body,
              message: "そのユーザー名は既に登録済みです",
            });
          }
        }
      );
    }
  });
});

module.exports = router;
