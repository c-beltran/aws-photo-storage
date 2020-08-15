CREATE TABLE users(
    id serial PRIMARY KEY NOT NULL,
    user_name varchar(32),
    email varchar(64) not null unique,
    password varchar(256)
);