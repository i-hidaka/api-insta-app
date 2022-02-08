var express = require("express");
var router = express.Router();
var { generateUploadURL } = require("./s3");

router.get("/", async (req, res) => {
  const url = await generateUploadURL();
  res.send({ url });
});

module.exports = router;
