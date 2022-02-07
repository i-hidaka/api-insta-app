var express = require("express");
const { rethrow } = require("jade/lib/runtime");
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
router.post("/signup", function (req, res) {
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
  imgUrl: Array,
  caption: String,
  prefecture: Object,
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
  let userData = new Object();
  let postDatas = [];
  let followUserDatas = [];
  let commentDatas = [];
  //   自分のデータ取得
  async function getMyData() {
    await usermodel
      .find({ userId: req.params.id })
      .exec()
      .then((userResult) => {
        userData = userResult[0];
      });
  }
  // 自分のフォローしてる人の投稿取得
  async function getPost() {
    for (let follow of userData.follow) {
      await postmodel
        .find({ userId: follow })
        .exec()
        .then((followResult) => {
          postDatas.push(followResult);
        });
    }
  }
  //   フォローしている人の情報取得
  async function getPostUser() {
    await usermodel
      .find({ userId: userData.follow })
      .exec()
      .then((followUserDataResult) => {
        followUserDatas = followUserDataResult;
      });
  }
  // 投稿に紐付いたコメントを取得
  async function getComment() {
    for (let userPosts of postDatas) {
      for (let userPost of userPosts) {
        await commentmodel
          .find({ postId: userPost.postId })
          .exec()
          .then((commentResult) => {
            commentDatas.push(commentResult);
          });
      }
    }
  }
  //   自分のデータ取得
  getMyData().then((result) => {
    // 自分のフォローしてる人の投稿取得
    getPost().then((result) => {
      //   フォローしている人の情報取得
      // console.log(postDatas);
      getPostUser().then((result) => {
        // 投稿に紐付いたコメントを取得
        getComment().then((result) => {
          // console.log(commentDatas);
          const newPostDatas = [];
          // 投稿とユーザー情報を紐付ける
          for (let userPostDatas of postDatas) {
            for (let userPostData of userPostDatas) {
              for (let followUserData of followUserDatas) {
                if (userPostData.userId === followUserData.userId) {
                  // mongooseで取得したオブジェクトはtoObjectで新しい変数に代入しないとプロパティの編集できない？
                  const postData = userPostData.toObject();
                  postData.userInfo = followUserData;
                  newPostDatas.push(postData);
                }
              }
            }
          }
          // console.log(newPostDatas);

          // 投稿とユーザー情報が紐付いたものにコメントを紐付ける
          const completePosts = [];
          for (let newPostData of newPostDatas) {
            // コメントを入れる空の配列を作成
            newPostData.comments = [];
            // comments・・・postIdごとに別れたコメントの配列
            for (let comments of commentDatas) {
              for (let comment of comments) {
                if (newPostData.postId === comment.postId) {
                  newPostData.comments.push(comment);
                }
              }
            }
            completePosts.push(newPostData);
          }
          
          // 投稿日でsort;
          completePosts.sort(function (a, b) {
            return a.postDate > b.posyDate ? 1 : -1;
          });
          // コメントの日付をsort
          for (let data of completePosts) {
            data.comments.sort(function (a, b) {
              return a.commentDate > b.commentData ? 1 : -1;
            });
          }
          // console.log(sortPostDate);

          res.send(completePosts);
        });
      });
    });
  });
});

// ユーザー情報変更
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
// 投稿にいいねする
router.post("/favorite", function (req, res) {
  const postmodel = mongoose.model("posts", postSchema);
  postmodel.find({ postId: req.body.postId }, function (err, result) {
    if (result[0].favorite.includes(req.body.userName) === true) {
      res.send({
        status: "error",
        data: req.body,
        message: "既にいいねしています",
      });
    } else {
      result[0].favorite.push(req.body.userName);
      result[0].save();
      res.send(result[0]);
    }
  });
});
// ユーザーページ
router.get("/mypage/:id", function (req, res) {
  const usermodel = mongoose.model("users", userSchema);
  let user = "";
  async function getUser() {
    await usermodel
      .find({ userId: req.params.id })
      .exec()
      .then((result) => {
        user = result[0];
      });
  }
  const postmodel = mongoose.model("posts", postSchema);
  let post = "";
  async function getPost() {
    await postmodel
      .find({ userId: req.params.id })
      .exec()
      .then((result) => {
        post = result;
      });
  }
  getUser().then((result) => {
    getPost().then((result) => {
      res.send({ user: user, post: post });
    });
  });
});

// 名前でアカウント検索
router.get("/search/account", function (req, res) {
  const usermodel = mongoose.model("users", userSchema);
  usermodel.find(
    // 検索欄の文字列を含むもの全て検索
    { userName: new RegExp(req.body.searchUserName) },
    function (err, result) {
      if (result.length === 0) {
        res.send({ message: "そのユーザー名は存在しません" });
      } else {
        res.send(result);
      }
    }
  );
});
// フォローフォロワーの情報取得
router.get("/followinfo/:id", function (req, res) {
  const usermodel = mongoose.model("users", userSchema);
  let follows = [];
  let followers = [];
  let followinfo = [];
  let followerinfo = [];
  async function getfollowUser() {
    await usermodel
      .find({ userId: req.params.id })
      .exec()
      .then((result) => {
        follows = result[0].follow;
        followers = result[0].follower;
      });
  }
  async function getfollowinfo() {
    for (let follow of follows) {
      await usermodel
        .find({ userId: follow })
        .exec()
        .then((result) => {
          followinfo.push(result[0]);
        });
    }
  }
  async function getfollowerinfo() {
    for (let follower of followers) {
      await usermodel
        .find({ userId: follower })
        .exec()
        .then((result) => {
          followerinfo.push(result[0]);
        });
    }
  }
  getfollowUser().then((result) => {
    getfollowinfo().then((result) => {
      getfollowerinfo().then((result) => {
        res.send({ follow: followinfo, follower: followerinfo });
      });
    });
  });
});

// フォローする
router.post("/follow", function (req, res) {
  // 自分のフォローリストに追加
  const usermodel = mongoose.model("users", userSchema);
  usermodel.find({ userId: req.body.userId }, function (err, result) {
    if (result[0].follow.includes(req.body.targetUserId) === true) {
      res.send({
        status: "eror",
        data: req.body,
        message: "既にフォローリストに入っています",
      });
    } else {
      result[0].follow.push(req.body.targetUserId);
      result[0].save();
      res.send(result[0]);
    }
  });
  // 対象のフォロワーリストに追加
  usermodel.find({ userId: req.body.targetUserId }, function (err, result) {
    if (result[0].follow.includes(req.body.userId) === true) {
      res.send({
        status: "eror",
        data: req.body,
        message: "既に相手のフォロワーリストに入っています",
      });
    }
    result[0].follower.push(req.body.userId);
    result[0].save();
  });
});

// フォロー解除
router.post("/unfollow", function (req, res) {
  // 自分のフォローリストから削除
  const usermodel = mongoose.model("users", userSchema);
  usermodel.find({ userId: req.body.userId }, function (err, result) {
    if (result[0].follow.includes(req.body.targetUserId) === false) {
      res.send({
        status: "error",
        data: req.body,
        message: "対象をフォローしていません",
      });
    } else {
      const index = result[0].follow.indexOf(req.body.targetUserId);
      result[0].follow.splice(index, 1);
      result[0].save();
      res.send(result[0]);
    }
  });
  // 対象のフォロワーリストから削除
  usermodel.find({ userId: req.body.targetUserId }, function (err, result) {
    if (result[0].follow.includes(req.body.userId) === false) {
      res.send({
        status: "error",
        data: req.body,
        message: "対象のフォロワーリストに入っていません",
      });
    } else {
      const index = result[0].follower.indexOf(req.body.userId);
      result[0].follower.splice(index, 1);
      result[0].save();
    }
  });
});

module.exports = router;
