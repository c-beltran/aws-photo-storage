const { Client } = require("pg");
const connectionString = process.env.DATABASE_URL;
const client = new Client({
  connectionString: connectionString,
  /* 
    ssl may need to be removed when
    working with a local env.  
  */
  ssl: {
    auto: false,
    rejectUnauthorized: false
  }
});

client.connect();

module.exports = {
  query: (text, params, callback) => {
    return client.query(text, params, callback);
  },
};
