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
    Key: imageName,
    Expires: 60,
  };

  const uploadURL = await s3.getSignedUrlPromise("putObject", params);
  return uploadURL;
}
module.exports.generateUploadURL = generateUploadURL;
