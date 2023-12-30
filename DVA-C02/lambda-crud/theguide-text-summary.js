import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SageMakerClient, InvokeEndpointCommand } from "@aws-sdk/client-sagemaker";

const s3Client = new S3Client({ region: "us-east-1" });
const sageMakerClient = new SageMakerClient({ region: "us-east-1" });
const bucketName = "theguide-rapify";
const endpointName = "your-sagemaker-endpoint-name"; // replace with your SageMaker endpoint name

export const handler = async (event, context) => {
    let body;
    let data;
    let userId;
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
            case "POST /ai/summary": // Summarize content
                requestJSON = JSON.parse(event.body);
                const userContent = requestJSON.content;

                // Invoke SageMaker endpoint to summarize the content
                const params = {
                    EndpointName: endpointName,
                    Body: Buffer.from(JSON.stringify({ instances: [{ content: userContent }] })),
                    ContentType: 'application/json',
                };
                const response = await sageMakerClient.send(new InvokeEndpointCommand(params));
                const predictions = JSON.parse(Buffer.from(response.Body).toString('utf8'));
                const summary = predictions.predictions[0].summary;

                body = { summary };
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
