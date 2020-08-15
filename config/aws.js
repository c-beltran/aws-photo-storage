require("dotenv").config();
var AWS = require("aws-sdk");

module.exports = {
  configuraion: {
    region: process.env.BUCKET_REGION,
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: process.env.IDENTITY_POOL_ID,
    }),
  },
  s3: {
    apiVersion: "2006-03-01",
    params: { Bucket: process.env.ALBUM_BUCKET_NAME },
  },
};
