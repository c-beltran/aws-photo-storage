var db = require("../config/db.js");

module.exports = {
  create: function (albumID, title, details, imageURL, callback) {
    const date = new Date().toLocaleString().split(',')[0]
    const q = `INSERT INTO images (
                album_id,
                title,
                details,
                image_url,
                created_at)
                VALUES($1, $2, $3, $4, $5) RETURNING image_id;`;
    const values = [albumID, title, details, imageURL, date];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows[0]);
      }
    });
  },

  update: function (title, details, imageURL, albumID, callback) {
    const date = new Date().toLocaleString().split(',')[0]
    const q = `
            UPDATE
              images
            SET
              title = $1,
              details = $2
            WHERE
              (image_url = $3 AND album_id = $4)`;
    const values = [title, details, imageURL, albumID];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows[0]);
      }
    });
  },

  delete: function (imageID, callback) {
    const q = `DELETE FROM images
            WHERE image_id = $1;`;
    const values = [imageID];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows[0]);
      }
    });
  },

  findByImgURL: function (imageURL, callback) {
    const q = `SELECT image_id, album_id, title, details, created_at
            FROM
                images
            WHERE
                image_url = $1`;
    const values = [imageURL];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows[0]);
      }
    });
  },

  findByAlbumID: function (albumID, callback) {
    const q = `SELECT image_id, title, details, image_url, created_at
            FROM
                images
            WHERE
              album_id = $1`;
    const values = [albumID];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows);
      }
    });
  },
};
