import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    ScanCommand,
    PutCommand,
    DeleteCommand,
    QueryCommand,
    GetCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const tableName = "theguide-notifications";

export const handler = async (event, context) => {
    let body;
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
            case "POST /notifications": // Create notification
                let requestJSON = JSON.parse(event.body);

                try {
                    body = await dynamo.send(
                        new ScanCommand({ TableName: tableName })
                    );
                    let id = body.Items.length;

                    body = await dynamo.send(
                        new GetCommand({
                            TableName: 'theguide-users',
                            Key: { id: requestJSON.receiver }
                        })
                    );
                    let email = body.Item.email;

                    /**
                     * 
                     * @param {*} data 
                     * message: requestJSON.message,
                     * type: requestJSON.type, // type : system | post_change | subject_change
                     * receiver: requestJSON.receiver
                     * navigate: requestJSON.navigate
                     * createAt: requestJSON.createAt
                     * @returns 
                     */
                    await dynamo.send(
                        new PutCommand({
                            TableName: tableName, // Change the table name
                            Item: {
                                id: `${id}`,
                                message: requestJSON.message,
                                type: requestJSON.type,
                                receiver: email,
                                navigate: requestJSON.navigate,
                                createAt: requestJSON.createAt
                            },
                            ConditionExpression: 'attribute_not_exists(id)', // Change the condition to check for id
                        })
                    );
                    body = requestJSON;
                } catch (error) {
                    body = error;
                    statusCode = 500;
                }
                break;

            case "GET /notifications": // Read all subject
                body = await dynamo.send(
                    new ScanCommand({ TableName: tableName })
                );
                body = body.Items;
                break;

            case "GET /notifications/{userId}": // Get notifications by user id
                let receiverEmail = event.pathParameters.userId; // Get the user id from the path parameter
                try {
                    let data = await dynamo.send(
                        new QueryCommand({
                            TableName: tableName, // The table name
                            IndexName: 'receiver-index', // The name of the GSI
                            KeyConditionExpression: 'receiver = :receiverEmail', // The condition to query by user id
                            ExpressionAttributeValues: {
                                ':receiverEmail': receiverEmail // The value of the user id
                            },
                            ScanIndexForward: true // To sort the results by createAt in descending order
                        })
                    );
                    body = data.Items; // The array of notifications
                } catch (error) {
                    body = error;
                    statusCode = 500;
                }
                break;


            case "DELETE /notifications/{id}": // Delete post
                await dynamo.send(
                    new DeleteCommand({
                        TableName: tableName,
                        Key: {
                            id: event.pathParameters.id
                        }
                    })
                );
                body = `Deleted item ${event.pathParameters.id}`;
                break;

            default:
                throw new Error(`Unsupported route: "${event.routeKey}"`);
        }
    } catch (err) {
        statusCode = 400;
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