# aws-photo-storage

## Table of contents
* [General info](#general-info)
* [Technologies](#technologies)
* [Setup](#setup)

## General info
This is a simple budget friendly photo album. You can read more about my journey on this project in the following blog post - _[budget photo album using aws s3](https://beltranca.medium.com/budget-photo-album-using-aws-s3-fbef342b2bcf)_.

## Technologies
Project is created with:

 ![](https://img.shields.io/badge/Cloud-AWS-informational?style=flat&logo=amazon&logoColor=white&color=2bbc8a)
 ![](https://img.shields.io/badge/CSS-Bulma-informational?style=flat&logo=bulma&logoColor=white&color=2bbc8a)
 ![](https://img.shields.io/badge/Code-JavaScript-informational?style=flat&logo=JavaScript&logoColor=white&color=2bbc8a)
 ![](https://img.shields.io/badge/JS%20framework-Galleria-informational?style=flat&logo=google&logoColor=white&color=2bbc8a)
 ![](https://img.shields.io/badge/Node.js-V11.2.0-informational?style=flat&logo=node.js&logoColor=white&color=2bbc8a)
 ![](https://img.shields.io/badge/Paas%20hosting-Heroku-informational?style=flat&logo=heroku&logoColor=white&color=2bbc8a)
 ![](https://img.shields.io/badge/PostgreSQL-V12.2-informational?style=flat&logo=postgresql&logoColor=white&color=2bbc8a)
 ![](https://img.shields.io/badge/Tools-NPM-informational?style=flat&logo=npm&logoColor=white&color=2bbc8a)
 ![](https://img.shields.io/badge/Tools-VSCode-informational?style=flat&logo=visual-studio-code&logoColor=white&color=2bbc8a)
 ![](https://img.shields.io/badge/Tools-TablePlus-informational?style=flat&logo=&logoColor=white&color=2bbc8a)


## Setup
To run this project, you will need the following:
- An AWS [account](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/).
- Follow the prerequisite tasks and CORS configuration from this [AWS doc](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/s3-example-photo-album.html).
- Create a postgres database for this project, I've set it to `memories` you may name it whatever you want.

After completing the above and cloning the project, you can uncomment and update the environment variables accordingly in the `.env` file.
```bash
JWT_SECRET_KEY="insert_secret"

# --- AWS ---
ALBUM_BUCKET_NAME="insert_bucket_name"
BUCKET_REGION="insert_bucket_region"
IDENTITY_POOL_ID="insert_identity_pool_id"

# --- Postgres ---
DATABASE_URL="postgres://postgres:postgres@localhost:5432/memories"

# --- For access to settings page ---
SECRET_PASSWORD="insert_secret_password"

```

Next, navigate to your project and run:
```bash
$ npm install
```

Next, run the migrationa to ensure that the DB is properly setup:
```bash
$ db-migrate up
```

Last but not least, we want to start the project!
```bash
$ nodemon app.js
```

You should see a message on your terminal saying `STARTED APP ON PORT 8000`.

Go to your browser and type `http://localhost:8000/`, you should see the _Welcome_ page.

To create a user go to `http://localhost:8000/settings` and enter your `SECRET_PASSWORD`. You should now be able to log in and start creating albums and uploading photos to your S3 bucket.

Code released under [the MIT license](https://github.com/c-beltran/aws-photo-storage/blob/master/LICENSE).
