CREATE TABLE album (
  id serial PRIMARY KEY NOT NULL,
  name varchar(100),
  details text,
  image_background_url varchar(255),
  created_at varchar(32),
  updated_at varchar(32)
);