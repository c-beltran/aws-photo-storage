require("dotenv").config();

var aws = require("../config/aws.js");
var albumDB = require("../models/albums.js");
var userDB = require("../models/users.js");
var imageDB = require("../models/images.js");

var express = require("express");
var jwt = require("jsonwebtoken");
var router = express.Router();
var AWS_SDK = require("aws-sdk");
var bcrypt = require("bcrypt");
var multer = require("multer");
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });
var jwtSecret = process.env.JWT_SECRET_KEY;

AWS_SDK.config.update(aws.configuraion);
var s3 = new AWS_SDK.S3(aws.s3);

router.get("/", function (req, res) {
  res.render("home");
});

// Lists all the Albums.
router.get("/albums", verifyToken, function (req, res) {
  jwt.verify(req.token, jwtSecret, function (err, authData) {
    if (err) {
      res.sendStatus(403);
    } else {
      s3.listObjects({ Delimiter: "/" }, function (err, data) {
        if (err) {
          return res.status(400).send({
            message: `There was an error listing your albums: ${err}`,
          });
        } else {
          let albums = [];
          for (let i in data.CommonPrefixes) {
            let prefix = data.CommonPrefixes[i].Prefix;
            let name = decodeURIComponent(prefix.replace("/", ""));
            let album = {
              prefix: prefix,
              name: name,
            };
            albums.push(album);
          }

          // find albums imgURL from db
          albumDB.findAllImgBkgs(function (err, val) {
            if (err) {
              console.log("err finding imgURLs: ", err.stack);
            }

            for (let i = 0; i < val.length; i++) {
              if (
                val[i].image_background_url == null ||
                val[i].image_background_url == undefined
              ) {
                val[i].image_background_url = "/assets/memoriesbk.png";
              }

              albums[i].image = val[i].image_background_url;
              albums[i].details = val[i].details;
            }

            res.render("albums", {
              albums: albums,
            });
          });
        }
      });
    }
  });
});

// Creates an album.
router.post("/newAlbum", verifyToken, function (req, res) {
  jwt.verify(req.token, jwtSecret, function (err, authData) {
    if (err) {
      res.sendStatus(403);
    } else {
      var albumName = req.query.nameCapitalized;
      var albumdetails = req.query.details;

      albumName = albumName.trim();
      if (!albumName) {
        res.status(400).send({
          message: "Album names must contain at least one non-space character.",
        });
      }
      if (albumName.indexOf("/") !== -1) {
        res.status(400).send({
          message: "Album names cannot contain slashes.",
        });
      }

      var albumKey = encodeURIComponent(albumName) + "/";
      s3.headObject({ Key: albumKey }, function (err, data) {
        if (err === null) {
          return res.status(400).send("Album already exists.");
        }
        if (err.code !== "NotFound") {
          return res.status(404).send({
            message: `There was an error creating your album: ${err.message}`,
          });
        }

        s3.putObject({ Key: albumKey }, function (err, data) {
          if (err) {
            return res.status(400).send({
              message: `There was an error creating your album: ${err.message}`,
            });
          }

          albumDB.create(albumName, albumdetails, function (err, val) {
            if (err) {
              return res.status(400).send({
                message: `There was an error creating your album: ${err.stack}`,
              });
            }
          });

          res.status(200).send({
            message: `Album: ${albumName} was created successfully`,
          });
          // viewAlbum(albumName); **will redirect to this in the future**
        });
      });
    }
  });
});

// Views album content.
router.get("/albums/:albumName/view", verifyToken, function (req, res) {
  jwt.verify(req.token, jwtSecret, function (err, authData) {
    if (err) {
      res.sendStatus(403);
    } else {
      var albumPhotosKey = encodeURIComponent(req.params.albumName) + "//";
      s3.listObjects({ Prefix: albumPhotosKey }, function (err, data) {
        if (err) {
          return res.status(400).send({
            message: `There was an error viewing your album: ${err.message}`,
          });
        }
        // 'this' references the AWS.Response instance that represents the response
        var href = this.request.httpRequest.endpoint.href;
        var bucketUrl = href + aws.s3.params.Bucket + "/";

        var photos = data.Contents.map(function (photo) {
          var photoKey = photo.Key;
          var photoUrl = bucketUrl + encodeURIComponent(photoKey);

          return {
            pKey: photoKey,
            pURL: photoUrl,
          };
        });

        var payload = {
          albumName: req.params.albumName,
          bucketURL: bucketUrl,
          photos: photos,
        };

        res.render("images", {
          payload: payload,
        });
      });
    }
  });
});

// Upload photo
router.post("/uploadPhoto", verifyToken, upload.array("files"), function (req, res) {
  jwt.verify(req.token, jwtSecret, function (err, authData) {
    if (err) {
      res.sendStatus(403);
    } else {
      var albumName = req.query.albumName;
      var file = req.files;
      var responseData = []

      file.map((item) => {
        var fileName = item.originalname;
        var albumPhotosKey = encodeURIComponent(albumName) + "//";
        var photoKey = albumPhotosKey + fileName;

         // file must be converted to base64 to upload to AWS
        var base64data = new Buffer.from(item.buffer, "binary");

        var params = {
          Bucket: aws.s3.params.Bucket,
          Key: photoKey,
          Body: base64data,
          ACL: "public-read",
        };
        s3.upload(params, function (err, data) {
          if (err) {
            res.json({ error: true, Message: err });
          } else {
            responseData.push(data);
            if (responseData.length == file.length) {
              res.json({
                error: false,
                message: "Image(s) uploaded successfully",
                data: responseData,
              });
            }
          }
        });
      });
    }
  });
});

// Delete photo
router.post("/deletePhoto", verifyToken, function (req, res) {
  jwt.verify(req.token, jwtSecret, function (err, authData) {
    if (err) {
      res.sendStatus(403);
    } else {
      var photoKey = req.query.photoKey;
      var imgURL = req.query.imgURL;

      s3.deleteObject({ Key: photoKey }, function (err, data) {
        if (err) {
          return res.status(404).send({
            message: `There was an error deleting your photo: ${err.message}`,
          });
        }

        imageDB.findByImgURL(imgURL, function(err, val){
          if (err) {
            return res.status(404).send({
              message: `There was an error finding photo to be deleted: ${err.message}`,
            });
          }

          // this means the photo didnt have image title or details
          if (val === undefined) {
            return res.status(200).send({
              message: `Photo was Successfully deleted.`,
            });
          } else {
            imageDB.delete(val.image_id, function(err, val){
              if (err) {
                return res.status(404).send({
                  message: `There was an error deleting photo: ${err.message}`,
                });
              }

              res.status(200).send({
                message: `Photo was Successfully deleted.`,
              });
            });
          }
        });
      });
    }
  });
});

// Delete album
router.post("/deleteAlbum", verifyToken, function (req, res) {
  jwt.verify(req.token, jwtSecret, function (err, authData) {
    if (err) {
      res.sendStatus(403);
    } else {
      var albumName = req.query.albumName;
      var albumKey = encodeURIComponent(albumName) + "/";
      s3.listObjects({ Prefix: albumKey }, function (err, data) {
        if (err) {
          return res.status(400).send({
            message: `There was an error deleting your album: ${err.message}`,
          });
        }
        var objects = data.Contents.map(function (object) {
          return { Key: object.Key };
        });
        s3.deleteObjects(
          {
            Delete: { Objects: objects, Quiet: true },
          },
          function (err, data) {
            if (err) {
              return res.status(400).send({
                message: `There was an error deleting your album: ${err.message}`,
              });
            }

            albumDB.findByName(albumName, function (err, val) {
              if (err) {
                console.log("There was an error finding your album: ", err.stack);
              }

              albumDB.delete(val.id, function (err) {
                if (err) {
                  console.log(
                    "There was an error deleting your album: ",
                    err.stack
                  );
                }

                res.status(200).send({
                  message: `Album: ${albumName} was Successfully deleted.`,
                });
              });
            });
          }
        );
      });
    }
  });
});

// - login & auth

// login/verify user
router.post("/login", function (req, res) {
  let username = req.query.username;
  let password = req.query.password;

  userDB.findByUserName(username, async (err, val) => {
    if (val === undefined) {
      return res.status(404).send({
        message: `Invalid username or password, login is case sensitive`,
      });
    } else if (err) {
      return res.status(500).send({
        message: `userDB.findByUserName: ${err.stack}`,
      });
    }

    try {
      if (await bcrypt.compare(password, val.password)) {
        jwt.sign({ user: val }, jwtSecret, { expiresIn: 7200000 }, function (err, token) {
          res.cookie("jwt", token, { httpOnly: true, maxAge: 7200000 });
          res.json({ token });
        });
      } else {
        return res.status(401).send({
          message: `incorrect password`,
        });
      }
    } catch (err) {
      return res.status(404).send({
        message: `user not found: ${err.stack}`,
      });
    }
  });
});

//- JWT

function verifyToken(req, res, next) {
  // Get auth header value
  const bearerHeader = req.headers.cookie;

  if (typeof bearerHeader !== "undefined") {
    const bearer = bearerHeader.split("=");
    const token = bearer[1];
    req.token = token;

    next();
  } else {
    res.sendStatus(403);
  }
}

//- logout user

router.post("/logOutUser", verifyToken, function (req, res) {
  jwt.verify(req.token, jwtSecret, function (err, authData) {
    if (err) {
      res.sendStatus(403);
    } else {
      res.clearCookie('jwt', {
        path: '/',
        secure: false,
        httpOnly: true,
      });

      res.end()
    }
  });
});

//- settings page

// display settings page
router.get("/settings", function (req, res) {
  res.render("settings");
});

// allow user to config only if secret is provided
router.post("/userAccessToConfig", function (req, res) {
  let userAnswer = req.query.answer;

  if (userAnswer != process.env.SECRET_PASSWORD) {
    res.status(405).send("User not allowed...try again");
  } else {
    res.status(200).send("Access granted!");
  }
});

// create user
router.post("/createUser", async (req, res) => {
  const userName = req.query.userName;
  const email = req.query.email;
  const password = req.query.password;

  try {
    // default salt is 10
    const salt = await bcrypt.genSalt(15);
    const hashedPswd = await bcrypt.hash(password, salt);

    userDB.create(userName, email, hashedPswd, async (err, val) => {
      if (err) {
        return res.status(500).send({
          message: `There was an error creating the user: ${err.stack}`,
        });
      }

      res.status(200).send("User created successfully!");
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

// Update username
router.post("/updateUserName", async (req, res) => {
  const userName = req.query.userName;
  const email = req.query.email;
  const password = req.query.password;

  userDB.findByEmail(email, async (err, val) => {
    if (err) {
      return res.status(500).send({
        message: `user not found: ${err.stack}`,
      });
    }

    try {
      if (await bcrypt.compare(password, val.password)) {
        userDB.updateUserName(userName, email, async (err, val) => {
          if (err) {
            return res.status(500).send({
              message: `error updating username: ${err.stack}`,
            });
          }

          res.status(204).send("Username updated successfully!");
        });
      } else {
        res.send("Not Allowed, password is wrong");
      }
    } catch (err) {
      res.status(500).send(err);
    }
  });
});

// Update email
router.post("/updateEmail", async (req, res) => {
  const userName = req.query.userName;
  const email = req.query.email;
  const password = req.query.password;

  userDB.findByUserName(userName, async (err, val) => {
    if (err) {
      return res.status(500).send({
        message: `user not found: ${err.stack}`,
      });
    }

    try {
      if (await bcrypt.compare(password, val.password)) {
        userDB.updateEmail(email, userName, async (err, val) => {
          if (err) {
            return res.status(500).send({
              message: `error updating email: ${err.stack}`,
            });
          }

          res.status(204).send("Email updated successfully!");
        });
      } else {
        res.send("Not Allowed, password is wrong");
      }
    } catch (err) {
      res.status(500).send(err);
    }
  });
});

// Update password
router.post("/updatePassword", async (req, res) => {
  const userName = req.query.userName;
  const email = req.query.email;
  const password = req.query.password;

  userDB.findByEmail(email, async (err, val) => {
    if (err) {
      return res.status(500).send({
        message: `user not found: ${err.stack}`,
      });
    }
    userDB.findByUserName(userName, async (err, val) => {
      if (err) {
        return res.status(500).send({
          message: `user not found: ${err.stack}`,
        });
      }

      try {
        // default salt is 10
        const salt = await bcrypt.genSalt(15);
        const hashedPswd = await bcrypt.hash(password, salt);

        userDB.updatePassword(hashedPswd, email, async (err, val) => {
          if (err) {
            return res.status(500).send({
              message: `error updating email: ${err.stack}`,
            });
          }

          res.status(204).send({
            message: "Email updated successfully!",
          });
        });
      } catch (err) {
        res.status(500).send(err);
      }
    });
  });
});

// Delete user
router.post("/deleteUser", async (req, res) => {
  const userName = req.query.userName;

  userDB.findByUserName(userName, async (err, val) => {
    if (err) {
      return res.status(500).send({
        message: `error user not found: ${err.stack}`,
      });
    }
    userDB.delete(val.email, async (err, val) => {
      if (err) {
        return res.status(500).send({
          message: `error user not removed: ${err.stack}`,
        });
      }

      res.status(204).send({
        message: "User removed successfully!",
      });
    });
  });
});

//- end of settings

// album cover image
router.post("/albumImage", verifyToken, function (req, res) {
  jwt.verify(req.token, jwtSecret, function (err, authData) {
    if (err) {
      res.sendStatus(403);
    } else {
      var albumName = req.query.albumName;
      var imgURL = req.query.imgURL;

      albumDB.findByName(albumName, function (err, val) {
        if (err) {
          return res.status(400).send({
            message: `There was an error finding the album: ${err.stack}`,
          });
        }

        albumDB.updateImgBkg(val.id, imgURL, function (err, val) {
          if (err) {
            return res.status(400).send({
              message: `There was an error setting image background: ${err.stack}`,
            });
          }
          res.status(200).send({
            message: `Album image was successfully set.`,
          });
        });
      });
    }
  });
});

// creates image details
router.post("/imageDetails", verifyToken, function (req, res) {
  jwt.verify(req.token, jwtSecret, function (err, authData) {
    if (err) {
      res.sendStatus(403);
    } else {


      var albumName = req.query.albumName;
      var title = req.query.title;
      var details = req.query.details;
      var imgURL = req.query.imgURL;

      albumDB.findByName(albumName, function (err, val) {
        if (err) {
          return res.status(400).send({
            message: `There was an error finding the album: ${err.stack}`,
          });
        }

        imageDB.create(val.id, title, details, imgURL, function(err, val) {
          if (err) {
            return res.status(400).send({
              message: `There was an error saving image details: ${err.stack}`,
            });
          }
          res.status(200).send({
            message: `Details were Successfully saved.`,
          });
        });
      });
    }
  });
});

// gets all the image details
router.get("/allImageDetails", verifyToken, function (req, res) {
  jwt.verify(req.token, jwtSecret, function (err, authData) {
    if (err) {
      res.sendStatus(403);
    } else {
      var albumName = req.query.albumName

      albumDB.findByName(albumName, function(err, val) {
        if (err) {
          return res.status(400).send({
            message: `There was an error finding the album: ${err.stack}`,
          });
        } else if (val === undefined ){
          return res.status(404).send({
            message: `There was an error finding the album: ${err}`,
          });
        }

        imageDB.findByAlbumID(val.id, function(err, val) {
          if (err) {
            return res.status(400).send({
              message: `There was an error finding the image: ${err.stack}`,
            });
          }

          res.status(200).send({
            payload: val,
          });
        });
      });
    }
  });
});

// updates image details
router.post("/imageDetailsUpdate", verifyToken, function (req, res) {
  jwt.verify(req.token, jwtSecret, function (err, authData) {
    if (err) {
      res.sendStatus(403);
    } else {

      var albumName = req.query.albumName;
      var title = req.query.title;
      var details = req.query.details;
      var imgURL = req.query.imgURL;

      albumDB.findByName(albumName, function (err, val) {
        if (err) {
          return res.status(400).send({
            message: `There was an error finding the album: ${err.stack}`,
          });
        }

        imageDB.update(title, details, imgURL, val.id, function(err, val) {
          if (err) {
            return res.status(400).send({
              message: `There was an error updating image details: ${err.stack}`,
            });
          }
          res.status(200).send({
            message: `Details were successfully updated.`,
          });
        });
      });
    }
  });
});

// gets the image details
// router.get("/imageDetails", verifyToken, function (req, res) {
//   jwt.verify(req.token, jwtSecret, function (err, authData) {
//     if (err) {
//       res.sendStatus(403);
//     } else {
//       var imgURL = req.query.imgURL

//       imageDB.findByImgURL(imgURL, function(err, val) {
//         if (err) {
//           return res.status(400).send({
//             message: `There was an error finding the image: ${err.stack}`,
//           });
//         }
//         console.log("whats the val:", val)
//       });
//     }
//   });
// });

//export file
module.exports = router;
