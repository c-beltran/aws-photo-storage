CREATE TABLE images(
    image_id serial PRIMARY KEY NOT NULL,
    album_id integer NOT NULL,
    title varchar(100),
    details text,
    image_url varchar(255),
    created_at varchar(32),
    FOREIGN KEY (album_id) REFERENCES album(id) ON DELETE CASCADE
);