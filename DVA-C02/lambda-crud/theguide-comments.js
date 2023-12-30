import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    ScanCommand,
    PutCommand,
    DeleteCommand,
    UpdateCommand,
    GetCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const commentsTable = "theguide-comments";
const postsTable = "theguide-posts";

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
            case "POST /comments":
                try {
                    // Validate request body
                    const requestJSON = JSON.parse(event.body);
                    if (!requestJSON.id || !requestJSON.postId /* other required fields */) {
                        throw new Error('Request body missing required fields');
                    }

                    // Create comment
                    const createResult = await dynamo.send(
                        new PutCommand({
                            TableName: commentsTable,
                            Item: {
                                id: requestJSON.id,
                                postId: requestJSON.postId,
                                creatorId: requestJSON.creatorId,
                                content: requestJSON.content,
                                liked: requestJSON.liked,
                                disliked: requestJSON.disliked,
                                replyTo: requestJSON.replyTo,
                                createAt: requestJSON.createAt,
                                updatedAt: requestJSON.updatedAt,
                            },
                            ConditionExpression: 'attribute_not_exists(id)', // This ensures the item is only written if no item with the same id exists
                        })
                    )
                    // Append id to commentIds list
                    const updateResult = await dynamo.send(
                        new UpdateCommand({
                            TableName: postsTable,
                            Key: {
                                id: requestJSON.postId,
                            },
                            UpdateExpression: "SET commentIds = list_append(commentIds, :i)",
                            ExpressionAttributeValues: {
                                ':i': [requestJSON.id],
                            },
                        })
                    );

                    // Success
                    body = updateResult;

                } catch (error) {
                    statusCode = 500;
                    body = 'Failed to create comment';
                }

                break;

            case "GET /comments": // Read all comments
                body = await dynamo.send(
                    new ScanCommand({ TableName: commentsTable })
                );
                body = body.Items;
                break;

            case 'GET /comments/{id}': // Read a single post
                try {
                    body = await dynamo.send(
                        new GetCommand({
                            TableName: commentsTable,
                            Key: {
                                id: event.pathParameters.id
                            }
                        })
                    );
                    body = body.Item;
                } catch {
                    statusCode = 404;
                    body = null;
                }
                break;

            case 'PATCH /comments/{id}': // Update comments
                let newData = JSON.parse(event.body);
                let patchId = event.pathParameters.id;

                const updatePostCommand = {
                    TableName: commentsTable,
                    Key: {
                        id: `${patchId}`
                    },
                    UpdateExpression: 'SET #postId = :postId, #creatorId = :creatorId, #content = :content, #liked = :liked, #disliked = :disliked, #replyTo = :replyTo, #createAt = :createAt, #updatedAt = :updatedAt',
                    ExpressionAttributeNames: {
                        '#postId': 'postId',
                        '#creatorId': 'creatorId',
                        '#content': 'content',
                        '#liked': 'liked',
                        '#disliked': 'disliked',
                        '#replyTo': 'replyTo',
                        '#createAt': 'createAt',
                        '#updatedAt': 'updatedAt'
                    },
                    ExpressionAttributeValues: {
                        ':postId': newData.postId,
                        ':creatorId': newData.creatorId,
                        ':content': newData.content,
                        ':liked': newData.liked,
                        ':disliked': newData.disliked,
                        ':replyTo': newData.replyTo,
                        ':createAt': newData.createAt,
                        ':updatedAt': newData.updatedAt
                    }
                };

                try {
                    await dynamo.send(
                        new UpdateCommand(updatePostCommand)
                    );
                    body = newData;
                } catch {
                    statusCode = 500;
                    body = "Fail to update post";
                }
                break;

            case "DELETE /comments/{id}": // Delete post
                await dynamo.send(
                    new DeleteCommand({
                        TableName: commentsTable,
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