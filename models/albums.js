var db = require("../config/db.js");

module.exports = {
  create: function (name, details, callback) {
    const date = new Date().toLocaleString().split(',')[0]
    const q = `INSERT INTO album (
            name,
            details,
            created_at)
            VALUES($1, $2, $3) RETURNING id;`;
    const values = [name, details, date];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows[0]);
      }
    });
  },

  delete: function (id, callback) {
    const q = `DELETE FROM album
            WHERE id = $1;`;
    const values = [id];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows[0]);
      }
    });
  },

  updateDetails: function (id, callback) {
    const q = `UPDATE album
            SET
                details = $1
            WHERE
                id = $2;`;
    const values = [details, id];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows[0]);
      }
    });
  },

  findByName: function (name, callback) {
    const q = `SELECT id
            FROM
                album
            WHERE
                name = $1`;
    const values = [name];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows[0]);
      }
    });
  },

  findImgBkg: function (id, callback) {
    const q = `SELECT image_background_url, details
            FROM
                album
            WHERE
                id = $1`;
    const values = [id];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows[0]);
      }
    });
  },

  findAllImgBkgs: function (callback) {
    const q = `SELECT name, image_background_url, details
            FROM
                album
            ORDER BY
                name ASC;`;
    const values = [];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows);
      }
    });
  },

  updateImgBkg: function (id, imgURL, callback) {
    const q = `UPDATE album
            SET
                image_background_url = $1
            WHERE
                id = $2;`;
    const values = [imgURL, id];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows[0]);
      }
    });
  }
};
