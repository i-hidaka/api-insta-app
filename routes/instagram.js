var express = require("express");
var router = express.Router();
// ローカルのときは3000番　http://localhost:3000
// デプロイ先　https://api-instagram-app.herokuapp.com/
const jwt = require("jsonwebtoken");
const usermodel = require("./models/user");
const postmodel = require("./models/post");
const commentmodel = require("./models/comment");
const logmodel = require("./models/log");

// 会員登録する
router.post("/signup", function (req, res) {
  //   全件取得した後、一番最後のIDを取得（自動採番）
  usermodel.find({}, function (err, result) {
    const register = new usermodel();
    // 配列の一番最後のID番号に＋1
    register.userId = result[result.length - 1].userId + 1;
    register.userName = req.body.userName;
    register.password = req.body.password;
    register.follow = [];
    register.follower = [];
    register.icon =
      "https://s3.ap-northeast-1.amazonaws.com/i.hidaka-s3/247564d6c57500e49c659d1019f37162";
    register.bio = "";

    usermodel.find({ userName: req.body.userName }, function (err, nameResult) {
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
    });
  });
});

// ログイン
router.post("/login", function (req, res) {
  try {
    usermodel.find(
      { userName: req.body.userName, password: req.body.password },
      function (err, result) {
        if (result.length === 0) {
          res.send({
            status: "error",
            data: req.body,
            message: "ユーザー名とパスワードが一致しません",
          });
        } else {
          // jwtを生成する
          let token = jwt.sign({ userName: req.body.userName }, "secret", {
            expiresIn: "24h",
          });
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
            token: token,
          });
        }
      }
    );
  } catch (error) {
    res.send(error);
  }
});

// 投稿する
router.post("/post", function (req, res) {
  try {
    const post = new postmodel();
    postmodel.find({}, function (err, result) {
      post.postId = result[result.length - 1].postId + 1;
      post.userId = req.body.userId;
      post.imageUrl = req.body.imageUrl;
      post.caption = req.body.caption;
      post.prefecture = req.body.prefecture;
      post.postData = new Date();
      post.favorites = [];
      post.save();
      res.send({
        status: "success",
        data: {
          postId: post.postId,
          userId: post.userId,
          imageUrl: post.imageUrl,
          caption: post.caption,
          prefecture: post.prefecture,
          postData: post.postData,
          favorites: post.favorites,
        },
      });
    });
  } catch (error) {
    res.send(error);
  }
});

// コメントする
router.post("/comment", function (req, res) {
  try {
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
      // ログに残す
      logmodel.find({}, function (err, result) {
        postmodel.find({ postId: req.body.postId }, function (err, postResult) {
          // 自分でコメントしたときはログに残さない
          if (postResult[0].userId !== req.body.userId) {
            const log = new logmodel();
            log.logId = result[result.length - 1].logId + 1;
            log.type = "comment";
            log.date = new Date();
            log.contents = {
              newUser: comment.userId,
              postId: comment.postId,
              comment: comment.comment,
              commentId: comment.commentId,
            };
            // 通知するべき人のID
            log.informUserId = postResult[0].userId;
            log.checked = false;
            log.save();
          }
        });
      });
    });
  } catch (error) {
    res.send(error);
  }
});

// Home画面でフォローしてる人の投稿取得
router.get("/home/:id", function (req, res) {
  try {
    let userData = "";
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
      // 自分のIDもいれちゃう
      userData.follow.push(userData.userId);
      await postmodel
        .find({ userId: userData.follow })
        .exec()
        .then((followResult) => {
          postDatas = followResult;
        });
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
      for (let postData of postDatas) {
        commentDatas.push(postData.postId);
      }
      await commentmodel
        .find({ postId: commentDatas })
        .exec()
        .then((commentResult) => {
          commentDatas = commentResult;
        });
    }
    if (req.params.id === "undefined" || req.params.id === "null") {
      res.send("undefineだよー");
    } else {
      //   自分のデータ取得
      getMyData().then((result) => {
        if (userData === undefined) {
          res.send("そのユーザーいないよ");
        } else {
          // 自分のフォローしてる人の投稿取得
          getPost().then((result) => {
            //   フォローしている人の情報取得
            getPostUser().then((result) => {
              // 投稿に紐付いたコメントを取得
              getComment().then((result) => {
                const newPostDatas = [];
                // 投稿とユーザー情報を紐付ける
                for (let postData of postDatas) {
                  for (let followUserData of followUserDatas) {
                    if (postData.userId === followUserData.userId) {
                      // mongooseで取得したオブジェクトはtoObjectで新しい変数に代入しないとプロパティの編集できない？
                      const postNewData = postData.toObject();
                      postNewData.userInfo = followUserData;
                      newPostDatas.push(postNewData);
                    }
                  }
                }
                // // 投稿とユーザー情報が紐付いたものにコメントを紐付ける
                const completePosts = [];
                for (let newpostData of newPostDatas) {
                  //   // コメントを入れる空の配列を作成
                  newpostData.comments = [];
                  for (let commentData of commentDatas) {
                    if (commentData.postId === newpostData.postId) {
                      newpostData.comments.push(commentData);
                    }
                  }
                  completePosts.push(newpostData);
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
                res.send(completePosts);
              });
            });
          });
        }
      });
    }
  } catch (error) {
    res.send(error);
  }
});

// ユーザー情報変更
router.post("/setting", function (req, res) {
  try {
    usermodel.find({ userId: req.body.userId }, function (err, result) {
      let preUserName = result[0].userName;
      // 登録した名前と現在の名前が一致（変えていないとき)は保存する
      if (result[0].userName === req.body.userName) {
        result[0].userName = req.body.userName;
        result[0].icon = req.body.icon;
        result[0].bio = req.body.bio;
        result[0].save();
        res.send({ status: "success", data: result[0] });
      } else {
        // ユーザー名異なっていたら既に存在していないか検証
        usermodel.find(
          { userName: req.body.userName },
          function (err, nameResult) {
            // 既に存在していたら弾く
            if (nameResult.length >= 1) {
              res.send({
                status: "error",
                data: req.body,
                message: "そのユーザー名は既に登録済みです",
              });
            } else {
              result[0].userName = req.body.userName;
              result[0].icon = req.body.icon;
              result[0].bio = req.body.bio;
              result[0].save();
              res.send({ status: "success", data: result[0] });
            }
          }
        );

        // いいねリストから名前を検索して変更後の名前に上書きする
        postmodel.find({}, function (err, posts) {
          for (let post of posts) {
            const newfavorites = [];
            for (let favorite of post.favorites) {
              if (favorite === preUserName) {
                favorite = req.body.userName;
              }
              newfavorites.push(favorite);
            }
            post.favorites = newfavorites;
            post.save();
          }
        });
        // 履歴の名前を変更する
        logmodel.find({}, async function (err, results) {
          for (let log of results) {
            if (log.contents.newUser === preUserName) {
              log.contents.newUser = req.body.userName;
            }
            // 強制保存
            log.markModified("contents");
            log.save();
          }
        });
      }
    });
  } catch (error) {
    res.send(error);
  }
});

// 投稿にいいねする
router.post("/favorite", function (req, res) {
  try {
    postmodel.find({ postId: req.body.postId }, function (err, result) {
      if (result[0].favorites.includes(req.body.userName) === true) {
        res.send({
          status: "error",
          data: req.body,
          message: "既にいいねしています",
        });
      } else {
        result[0].favorites.push(req.body.userName);
        result[0].save();
        res.send(result[0]);
        // ログに残す
        usermodel.find(
          { userId: result[0].userId },
          function (err, userresult) {
            // 自分の投稿にいいねしたときはログに残さない
            if (req.body.userName !== userresult[0].userName) {
              logmodel.find({}, function (err, logResult) {
                const log = new logmodel();
                log.logId = logResult[logResult.length - 1].logId + 1;
                log.type = "favorite";
                log.date = new Date();
                log.contents = {
                  newUser: result[0].favorites[result[0].favorites.length - 1],
                  postId: req.body.postId,
                  comment: "",
                  commentId: "",
                };
                // 通知するべき人のID
                log.informUserId = result[0].userId;
                log.checked = false;
                log.save();
              });
            }
          }
        );
      }
    });
  } catch (error) {
    res.send(error);
  }
});

// いいね解除する
router.post("/unfavorite", function (req, res) {
  try {
    postmodel.find({ postId: req.body.postId }, function (err, result) {
      if (result[0].favorites.includes(req.body.userName) === true) {
        const index = result[0].favorites.indexOf(req.body.userName);
        result[0].favorites.splice(index, 1);
        result[0].save();
        res.send(result[0]);
        // 通知から消す
        logmodel.remove(
          {
            "contents.postId": req.body.postId,
            "contents.newUser": req.body.userName,
          },
          function () {}
        );
      } else {
        res.send({
          status: "error",
          data: req.body,
          message: "いいねしてません",
        });
      }
    });
  } catch (error) {
    res.send(error);
  }
});
// ユーザーページ
router.get("/mypage/:id", function (req, res) {
  try {
    let user = "";
    async function getUser() {
      await usermodel
        .find({ userId: req.params.id })
        .exec()
        .then((result) => {
          user = result[0];
        });
    }

    let post = "";
    async function getPost() {
      await postmodel
        .find({ userId: req.params.id })
        .exec()
        .then((result) => {
          post = result;
        });
    }
    getUser().then(() => {
      getPost().then(() => {
        res.send({ user: user, post: post });
      });
    });
  } catch (error) {
    res.send(error);
  }
});

// 名前でアカウント検索
router.post("/search/account", function (req, res) {
  try {
    usermodel.find(
      // 検索欄の文字列を含むもの全て検索
      { userName: new RegExp(req.body.userName) },
      function (err, result) {
        if (result.length === 0) {
          res.send({ status: "error", message: "検索結果がありませんでした" });
        } else {
          res.send(result);
        }
      }
    );
  } catch (error) {
    res.send(error);
  }
});

// フォローフォロワーの情報取得
router.get("/followinfo/:id", function (req, res) {
  try {
    let follows = [];
    let followers = [];
    let followinfo = [];
    let followerinfo = [];
    async function getfollowUser() {
      await usermodel
        .find({ userId: req.params.id })
        .exec()
        .then((result) => {
          if (result.length !== 0) {
            follows = result[0].follow;
            followers = result[0].follower;
          }
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
  } catch (error) {
    res.send(error);
  }
});

// フォローする
router.post("/follow", function (req, res) {
  try {
    // 自分のフォローリストに追加
    usermodel.find({ userId: req.body.userId }, function (err, result) {
      if (result[0].follow.includes(req.body.targetUserId) === true) {
        res.send({
          status: "error",
          data: req.body,
          message: "既にフォローリストに入っています",
        });
      } else {
        // 自分のフォローリストに追加
        result[0].follow.push(req.body.targetUserId);
        result[0].save();
        // 相手のフォロワーに追加
        usermodel.find(
          { userId: req.body.targetUserId },
          function (err, followerResult) {
            followerResult[0].follower.push(req.body.userId);
            followerResult[0].save();
            res.send(result[0]);
            // ログに残す
            logmodel.find({}, function (err, logResult) {
              const log = new logmodel();
              log.logId = logResult[logResult.length - 1].logId + 1;
              log.type = "follow";
              log.date = new Date();
              log.contents = {
                newUser:
                  followerResult[0].follower[
                    followerResult[0].follower.length - 1
                  ],
                postId: "",
                comment: "",
                commentId: "",
              };
              // 通知するべき人のID
              log.informUserId = req.body.targetUserId;
              log.checked = false;
              log.save();
            });
          }
        );
      }
    });
  } catch (error) {
    res.send(error);
  }
});

// フォロー解除
router.post("/unfollow", function (req, res) {
  try {
    // 自分のフォローリストから削除
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
        // 対象のフォロワーリストから削除
        usermodel.find(
          { userId: req.body.targetUserId },
          function (err, followerResult) {
            if (followerResult.length !== 0) {
              const index = followerResult[0].follower.indexOf(req.body.userId);
              followerResult[0].follower.splice(index, 1);
              followerResult[0].save();
            }
          }
        );
        res.send(result[0]);
        // 通知から消す
        logmodel.remove(
          {
            "contents.newUser": req.body.userId,
            informUserId: req.body.targetUserId,
          },
          function () {}
        );
      }
    });
  } catch (error) {
    res.send(error);
  }
});

// 投稿詳細画面
router.get("/postdetail/:id", function (req, res) {
  try {
    let postData = "";
    let commentData = "";
    let userInfo = "";
    let commentUserInfo = "";

    async function getPostDetail() {
      await postmodel
        .find({ postId: req.params.id })
        .exec()
        .then((result) => {
          postData = result[0];
        });
    }
    async function getComment() {
      await commentmodel
        .find({ postId: req.params.id })
        .exec()
        .then((result) => {
          commentData = result;
        });
    }
    async function getUserInfo() {
      await usermodel
        .find({ userId: postData.userId })
        .exec()
        .then((result) => {
          userInfo = result[0];
        });
    }
    async function getCommentUserInfo() {
      let commentUserIds = [];
      for (let comment of commentData) {
        commentUserIds.push(comment.userId);
      }

      await usermodel
        .find({ userId: commentUserIds })
        .exec()
        .then((result) => {
          commentUserInfo = result;
        });
    }
    getPostDetail().then(() => {
      getComment().then(() => {
        getUserInfo().then(() => {
          getCommentUserInfo().then(() => {
            const newPostData = postData.toObject();
            // 投稿にユーザー情報を紐付け
            newPostData.userinfo = userInfo;
            // コメントにユーザー情報紐付け
            const newCommentData = [];
            for (let comment of commentData) {
              let newComment = comment.toObject();
              for (let commentUser of commentUserInfo) {
                if (comment.userId === commentUser.userId) {
                  newComment.userInfo = commentUser;
                }
              }
              newCommentData.push(newComment);
            }
            newPostData.comments = newCommentData;
            res.send(newPostData);
          });
        });
      });
    });
  } catch (error) {
    res.send(error);
  }
});
// 投稿内容で検索する
router.post("/search/caption", function (req, res) {
  try {
    let posts = [];
    let userInfos = [];
    let comments = [];

    async function getPost() {
      await postmodel
        .find({ caption: new RegExp(req.body.caption) })
        .exec()
        .then((result) => {
          posts = result;
        });
    }
    async function getUser() {
      for (let post of posts) {
        userInfos.push(post.userId);
      }
      await usermodel
        .find({ userId: userInfos })
        .exec()
        .then((result) => {
          userInfos = result;
        });
    }
    async function getComment() {
      for (let post of posts) {
        comments.push(post.postId);
      }
      await commentmodel
        .find({ postId: comments })
        .exec()
        .then((result) => {
          comments = result;
        });
    }
    getPost().then(() => {
      getUser().then(() => {
        getComment().then(() => {
          const newPosts = [];
          for (let post of posts) {
            for (let userInfo of userInfos) {
              if (post.userId === userInfo.userId) {
                const userPost = post.toObject();
                userPost.userInfo = userInfo;
                newPosts.push(userPost);
              }
            }
          }
          const completePosts = [];
          for (let newPost of newPosts) {
            newPost.comments = [];
            for (let comment of comments) {
              if (newPost.postId === comment.postId) {
                newPost.comments.push(comment);
              }
            }
            completePosts.push(newPost);
          }
          if (completePosts.length === 0) {
            res.send({
              status: "error",
              message: "検索結果がありませんでした",
            });
          } else {
            res.send(completePosts);
          }
        });
      });
    });
  } catch (error) {
    res.send(error);
  }
});
// 都道府県で検索
router.post("/search/prefecture", function (req, res) {
  try {
    let posts = [];
    let users = [];
    let comments = [];
    async function getPosts() {
      await postmodel
        //RegExp(変数名,"gi")・・・ 大文字小文字を区別しない＆含み検索
        .find({ "prefecture.name": new RegExp(req.body.prefecture, "gi") })
        .exec()
        .then((result) => {
          posts = result;
        });
    }
    async function getUsers() {
      for (let post of posts) {
        users.push(post.userId);
      }
      await usermodel
        .find({ userId: users })
        .exec()
        .then((result) => {
          users = result;
        });
    }
    async function getComments() {
      for (let post of posts) {
        comments.push(post.postId);
      }
      await commentmodel
        .find({ postId: comments })
        .exec()
        .then((result) => {
          comments = result;
        });
    }
    getPosts().then(() => {
      getUsers().then(() => {
        getComments().then(() => {
          const newPostData = [];
          for (let post of posts) {
            for (let user of users) {
              if (post.userId === user.userId) {
                const postData = post.toObject();
                postData.userInfo = user;
                newPostData.push(postData);
              }
            }
          }
          const completePosts = [];
          for (let post of newPostData) {
            post.comments = [];
            for (let comment of comments) {
              if (comment.postId === post.postId) {
                post.comments.push(comment);
              }
            }
            completePosts.push(post);
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
          if (completePosts.length === 0) {
            res.send({
              status: "error",
              message: "検索結果がありませんでした",
            });
          } else {
            res.send(completePosts);
          }
        });
      });
    });
  } catch (error) {
    res.send(error);
  }
});
// 全ての投稿を取得する
router.get("/allposts", function (req, res) {
  try {
    let posts = [];
    let users = [];
    let comments = [];
    async function getallPosts() {
      await postmodel
        .find({})
        .exec()
        .then((result) => {
          posts = result.shift();
        });
    }
    async function getallUsers() {
      await usermodel
        .find({})
        .exec()
        .then((result) => {
          users = result;
        });
    }
    async function getallComments() {
      await commentmodel
        .find({})
        .exec()
        .then((result) => {
          comments = result;
        });
    }
    getallPosts().then(() => {
      getallUsers().then(() => {
        getallComments().then(() => {
          // postsにユーザーを紐付け
          const newPosts = [];
          for (let post of posts) {
            for (let user of users) {
              if (post.userId === user.userId) {
                const newpost = post.toObject();
                newpost.userInfo = user;
                newPosts.push(newpost);
              }
            }
          }
          const completePosts = [];
          // コメントを紐付け
          for (let newPost of newPosts) {
            newPost.comments = [];
            for (let comment of comments) {
              if (newPost.postId === comment.postId) {
                newPost.comments.push(comment);
              }
            }
            completePosts.push(newPost);
          }
          // // 投稿の日付でsort
          completePosts.sort((a, b) => {
            return a.postDate > b.postDate ? 1 : -1;
          });
          // コメントの日付でsort
          for (let post of completePosts) {
            post.comments.sort((a, b) => {
              return a.commentDate > b.commentDate ? 1 : -1;
            });
          }
          res.send(completePosts);
        });
      });
    });
  } catch (error) {
    res.send(error);
  }
});

// 通知を受け取る
router.get("/notice/:id", function (req, res) {
  try {
    let logs = "";
    let users = [];
    let commentFollowUsers = [];
    let favoriteusers = [];
    // ログを取得
    async function getlog() {
      await logmodel
        .find({ informUserId: req.params.id })
        .exec()
        .then((result) => {
          logs = result;
        });
    }
    // ログの中のユーザーを検索
    async function getUser() {
      for (let log of logs) {
        if (typeof log.contents.newUser === "string") {
          favoriteusers.push(log.contents.newUser);
        } else {
          commentFollowUsers.push(log.contents.newUser);
        }
      }
      // IDで検索
      await usermodel
        .find({ userId: commentFollowUsers })
        .exec()
        .then((result) => {
          users = result;
        });
      // 名前で検索
      await usermodel
        .find({ userName: favoriteusers })
        .exec()
        .then((results) => {
          for (let result of results) {
            users.push(result);
          }
        });
    }
    getlog().then(() => {
      getUser().then(() => {
        // console.log(users);
        const newlogs = [];
        for (let log of logs) {
          let newlog = log.toObject();
          for (let user of users) {
            // いいねのときは名前で検索
            if (newlog.type === "favorite") {
              if (newlog.contents.newUser === user.userName) {
                newlog.contents.newUser = user;
              }
            } else {
              if (newlog.contents.newUser === user.userId) {
                newlog.contents.newUser = user;
              }
            }
          }
          newlogs.push(newlog);
        }
        newlogs.sort(function (a, b) {
          return a.date < b.date ? 1 : -1;
        });
        res.send(newlogs);
      });
    });
  } catch (error) {
    res.send(error);
  }
});

// 通知を見たかどうかのフラッグを上げる
router.post("/notice/checked", function (req, res) {
  try {
    logmodel.find({ informUserId: req.body.userId }, function (err, results) {
      for (let result of results) {
        result.checked = true;
        result.save();
      }
      res.send(results);
    });
    // 今から7日過ぎたら履歴からデータを消す
    logmodel.find({}, function (err, results) {
      for (let result of results) {
        if (
          result.date < new Date(new Date().setDate(new Date().getDate() - 7))
        ) {
          console.log(result);
          logmodel.remove({ logId: result.logId }, function (err) {});
        }
      }
    });
  } catch (error) {
    res.send(error);
  }
});
// 全てのユーザー
router.get("/allusers", function (req, res) {
  usermodel.find({}, function (err, result) {
    res.send(result);
  });
});

// コメント削除
router.delete("/comment", function (req, res) {
  try {
    commentmodel.remove(
      { commentId: req.body.commentId },
      function (err, result) {
        if (result.deletedCount === 0) {
          res.send({
            status: "error",
            data: req.body.commentId,
            message: "そのコメントは存在しません",
          });
        } else {
          res.send({
            status: "success",
            data: req.body.commentId,
            message: "コメント削除完了",
          });
        }
      }
    );
    logmodel.remove(
      { "contents.commentId": req.body.commentId },
      function () {}
    );
  } catch (error) {
    res.send(error);
  }
});

// 投稿削除
router.delete("/post", function (req, res) {
  try {
    // 投稿削除
    postmodel.remove({ postId: req.body.postId }, function (err, result) {
      if (result.deletedCount === 0) {
        res.send({
          status: "error",
          data: req.body.postId,
          message: "その投稿は存在しません",
        });
      } else {
        res.send({
          status: "success",
          data: req.body.postId,
          message: "投稿削除完了",
        });
      }
    });
    // 投稿に紐付いたコメントも削除
    commentmodel.remove({ postId: req.body.postId }, function () {});
    // 投稿に紐付いた通知削除
    logmodel.remove({ "contents.postId": req.body.postId }, function () {});
  } catch (error) {
    res.send(error);
  }
});
module.exports = router;
