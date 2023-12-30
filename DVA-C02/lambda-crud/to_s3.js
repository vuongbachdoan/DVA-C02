import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: "us-east-1" });
const bucketName = "theguide-rapify";

export const handler = async (event, context) => {
    let body;
    let data;
    let type;
    let path;
    let base64Data;
    let userId;
    let base64String;
    let requestJSON;
    let statusCode = 200;
    const allowedOrigins = ['http://localhost:3000', 'https://beta-rapify-cloud.com'];
    const origin = event.headers.origin;
    let headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Credentials': true,
    };

    if (allowedOrigins.includes(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
    }

    try {
        switch (event.routeKey) {
            case "POST /users/{id}/avatar": // Upload avatar
                userId = event.pathParameters.id;
                requestJSON = JSON.parse(event.body);
                base64String = requestJSON.image;
                base64Data = Buffer.from(base64String, 'base64');

                // Getting the file type, ie: jpeg, png or gif
                type = requestJSON.type;
                path = `users/${userId}/avatar.${type}`;

                data = {
                    Bucket: bucketName,
                    Key: path,
                    Body: base64Data,
                    ContentEncoding: 'base64',
                    ContentType: `image/${type}`
                };

                try {
                    await s3Client.send(new PutObjectCommand(data));
                    body = `https://theguide-rapify.s3.amazonaws.com/${path}`;
                } catch (e) {
                    statusCode = 500;
                    body = e;
                }
                break;
            case "POST /posts/{id}/cover": // Upload cover
                userId = event.pathParameters.id;
                requestJSON = JSON.parse(event.body);
                base64String = requestJSON.image;
                base64Data = Buffer.from(base64String, 'base64');

                // Getting the file type, ie: jpeg, png or gif
                type = requestJSON.type;
                path = `posts/${userId}/cover.${type}`;

                data = {
                    Bucket: bucketName,
                    Key: path,
                    Body: base64Data,
                    ContentEncoding: 'base64',
                    ContentType: `image/${type}`
                };

                try {
                    await s3Client.send(new PutObjectCommand(data));
                    body = `https://theguide-rapify.s3.amazonaws.com/${path}`;
                } catch (e) {
                    statusCode = 500;
                    body = e;
                }
                break;

            case "POST /subjects/{id}/thumbnail": // Upload subject thumbnail
                let subjectCode = event.pathParameters.id;
                requestJSON = JSON.parse(event.body);
                base64String = requestJSON.image;
                base64Data = Buffer.from(base64String, 'base64');

                // Getting the file type, ie: jpeg, png or gif
                type = requestJSON.type;
                path = `subjects/${subjectCode}/thumbnail.${type}`;
                data = {
                    Bucket: bucketName,
                    Key: path,
                    Body: base64Data,
                    ContentEncoding: 'base64',
                    ContentType: `image/${type}`
                };

                try {
                    await s3Client.send(new PutObjectCommand(data));
                    body = `https://theguide-rapify.s3.amazonaws.com/${path}`;
                } catch (e) {
                    statusCode = 500;
                    body = e;
                }
                break;
        }
    } catch (err) {
        statusCode = 500;
        body = err.message;
    } finally {
        body = JSON.stringify(body);
    }

    return {
        statusCode,
        body,
        headers,
    };
};
