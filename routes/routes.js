var aws = require("../config/aws.js");
var albumsDB = require("../models/albums.js");
var usersDB = require("../models/users.js");
var imagesDB = require("../models/images.js");

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
          albumsDB.findAllImgBkgs(function (err, val) {
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
      const albumName = req.query.nameCapitalized;
      const albumdetails = req.query.details;

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

      const albumKey = encodeURIComponent(albumName) + "/";
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

          albumsDB.create(albumName, albumdetails, function (err, val) {
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
      const albumPhotosKey = encodeURIComponent(req.params.albumName) + "//";
      s3.listObjects({ Prefix: albumPhotosKey }, function (err, data) {
        if (err) {
          return res.status(400).send({
            message: `There was an error viewing your album: ${err.message}`,
          });
        }
        // 'this' references the AWS.Response instance that represents the response
        const href = this.request.httpRequest.endpoint.href;
        const bucketUrl = href + aws.s3.params.Bucket + "/";

        const photos = data.Contents.map(function (photo) {
          const photoKey = photo.Key;
          const photoUrl = bucketUrl + encodeURIComponent(photoKey);

          return {
            pKey: photoKey,
            pURL: photoUrl,
          };
        });

        const payload = {
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
      const albumName = req.query.albumName;
      const file = req.files;
      const responseData = []

      file.map((item) => {
        const fileName = item.originalname;
        const albumPhotosKey = encodeURIComponent(albumName) + "//";
        const photoKey = albumPhotosKey + fileName;

         // file must be converted to base64 to upload to AWS
        const base64data = new Buffer.from(item.buffer, "binary");

        const params = {
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
      const photoKey = req.query.photoKey;
      const imgURL = req.query.imgURL;

      s3.deleteObject({ Key: photoKey }, function (err, data) {
        if (err) {
          return res.status(404).send({
            message: `There was an error deleting your photo: ${err.message}`,
          });
        }

        imagesDB.findByImgURL(imgURL, function(err, val){
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
            imagesDB.delete(val.image_id, function(err, val){
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
      const albumName = req.query.albumName;
      const albumKey = encodeURIComponent(albumName) + "/";
      s3.listObjects({ Prefix: albumKey }, function (err, data) {
        if (err) {
          return res.status(400).send({
            message: `There was an error deleting your album: ${err.message}`,
          });
        }
        const objects = data.Contents.map(function (object) {
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

            albumsDB.findByName(albumName, function (err, val) {
              if (err) {
                console.log("There was an error finding your album: ", err.stack);
              }

              albumsDB.delete(val.id, function (err) {
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

//- Authentication

// login/verify user
router.post("/login", function (req, res) {
  let username = req.query.username;
  let password = req.query.password;

  usersDB.findByUserName(username, async (err, val) => {
    if (val === undefined) {
      return res.status(404).send({
        message: `Invalid username or password, login is case sensitive`,
      });
    } else if (err) {
      return res.status(500).send({
        message: `usersDB.findByUserName: ${err.stack}`,
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

// allow user to configure only if secret is provided
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

    usersDB.create(userName, email, hashedPswd, async (err, val) => {
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

  usersDB.findByEmail(email, async (err, val) => {
    if (err) {
      return res.status(500).send({
        message: `user not found: ${err.stack}`,
      });
    }

    try {
      if (await bcrypt.compare(password, val.password)) {
        usersDB.updateUserName(userName, email, async (err, val) => {
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

  usersDB.findByUserName(userName, async (err, val) => {
    if (err) {
      return res.status(500).send({
        message: `user not found: ${err.stack}`,
      });
    }

    try {
      if (await bcrypt.compare(password, val.password)) {
        usersDB.updateEmail(email, userName, async (err, val) => {
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

  usersDB.findByEmail(email, async (err, val) => {
    if (err) {
      return res.status(500).send({
        message: `user not found: ${err.stack}`,
      });
    }
    usersDB.findByUserName(userName, async (err, val) => {
      if (err) {
        return res.status(500).send({
          message: `user not found: ${err.stack}`,
        });
      }

      try {
        // default salt is 10
        const salt = await bcrypt.genSalt(15);
        const hashedPswd = await bcrypt.hash(password, salt);

        usersDB.updatePassword(hashedPswd, email, async (err, val) => {
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

  usersDB.findByUserName(userName, async (err, val) => {
    if (err) {
      return res.status(500).send({
        message: `error user not found: ${err.stack}`,
      });
    }
    usersDB.delete(val.email, async (err, val) => {
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
      const albumName = req.query.albumName;
      const imgURL = req.query.imgURL;

      albumsDB.findByName(albumName, function (err, val) {
        if (err) {
          return res.status(400).send({
            message: `There was an error finding the album: ${err.stack}`,
          });
        }

        albumsDB.updateImgBkg(val.id, imgURL, function (err, val) {
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

      const albumName = req.query.albumName;
      const title = req.query.title;
      const details = req.query.details;
      const imgURL = req.query.imgURL;

      albumsDB.findByName(albumName, function (err, val) {
        if (err) {
          return res.status(400).send({
            message: `There was an error finding the album: ${err.stack}`,
          });
        }

        imagesDB.create(val.id, title, details, imgURL, function(err, val) {
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
      const albumName = req.query.albumName

      albumsDB.findByName(albumName, function(err, val) {
        if (err) {
          return res.status(400).send({
            message: `There was an error finding the album: ${err.stack}`,
          });
        } else if (val === undefined ){
          return res.status(404).send({
            message: `There was an error finding the album: ${err}`,
          });
        }

        imagesDB.findByAlbumID(val.id, function(err, val) {
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

      const albumName = req.query.albumName;
      const title = req.query.title;
      const details = req.query.details;
      const imgURL = req.query.imgURL;

      albumsDB.findByName(albumName, function (err, val) {
        if (err) {
          return res.status(400).send({
            message: `There was an error finding the album: ${err.stack}`,
          });
        }

        imagesDB.update(title, details, imgURL, val.id, function(err, val) {
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

//export file
module.exports = router;
