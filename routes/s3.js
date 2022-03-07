var aws = require("aws-sdk");
var crypto = require("crypto");
var util = require("util");
const randomBytes = util.promisify(crypto.randomBytes);
// dotenv
var dotenv = require("dotenv");
dotenv.config();

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

const s3 = new aws.S3({
  accessKeyId,
  secretAccessKey,
  region,
  signatureVersion: "v4",
});

// upload a file to S3
async function generateUploadURL() {
  const rawBytes = await randomBytes(16);
  const imageName = rawBytes.toString("hex");

  const params = {
    Bucket: bucketName,
    Key: imageName + ".jpg",
    ContentType: "image/jpeg",
  };

  const uploadURL = await s3.getSignedUrlPromise("putObject", params);
  return uploadURL;
}
module.exports.generateUploadURL = generateUploadURL;

// delete files from S3
async function deleteFiles(urlArray) {
  let keyArray = [];
  for (let url of urlArray) {
    const key = url.split("amazonaws.com/").pop();
    keyArray.push({ Key: key });
  }
  const params = {
    Bucket: bucketName,
    Delete: {
      Objects: keyArray,
    },
  };
  await s3.deleteObjects(params, function (err, data) {
    // an error occurred
    if (err) console.log(err, err.stack);
  });
}
module.exports.deleteFiles = deleteFiles;
