var db = require("../config/db.js");

module.exports = {
  create: function (userName, email, password, callback) {
    const q = `INSERT INTO users (
                user_name,
                email,
                password)
                VALUES($1, $2, $3) RETURNING id;`;
    const values = [userName, email, password];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows[0]);
      }
    });
  },

  updatePassword: function (password, email, callback) {
    const q = `UPDATE users
                SET
                    password = $1
                WHERE
                    email = $2;`;
    const values = [password, email];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows[0]);
      }
    });
  },

  updateEmail: function (email, userName, callback) {
    const q = `UPDATE users
                SET
                    email = $1
                WHERE
                    user_name = $2;`;
    const values = [email, userName];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows[0]);
      }
    });
  },

  updateUserName: function (userName, email, callback) {
    const q = `UPDATE users
                SET
                    user_name = $1
                WHERE
                    email = $2;`;
    const values = [userName, email];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows[0]);
      }
    });
  },

  delete: function (email, callback) {
    const q = `DELETE FROM users
                WHERE email = $1;`;
    const values = [email];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows[0]);
      }
    });
  },

  findByEmail: function (email, callback) {
    const q = `SELECT id, user_name, password
                FROM
                    users
                WHERE
                    email = $1`;
    const values = [email];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows[0]);
      }
    });
  },

  findByUserName: function (userName, callback) {
    const q = `SELECT id, email, password
                FROM
                    users
                WHERE
                    user_name = $1`;
    const values = [userName];

    db.query(q, values, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, res.rows[0]);
      }
    });
  }
};
