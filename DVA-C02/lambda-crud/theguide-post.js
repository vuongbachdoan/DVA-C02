import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    ScanCommand,
    PutCommand,
    DeleteCommand,
    UpdateCommand,
    GetCommand,
    QueryCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const tableName = "theguide-posts";

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
            case "POST /posts": // Create post
                let requestJSON = JSON.parse(event.body);
                try {
                    await dynamo.send(
                        new PutCommand({
                            TableName: tableName,
                            Item: {
                                id: requestJSON.id,
                                subjectCode: requestJSON.subjectCode,
                                department: requestJSON.department,
                                title: requestJSON.title,
                                description: requestJSON.description,
                                creatorId: requestJSON.creatorId,
                                cover: requestJSON.cover,
                                createAt: requestJSON.createAt,
                                updatedAt: requestJSON.updatedAt,
                                content: requestJSON.content,
                                status: requestJSON.status,
                                liked: requestJSON.liked,
                                commentIds: requestJSON.commentIds,
                                shared: requestJSON.shared,
                                viewed: requestJSON.viewed
                            },
                            ConditionExpression: 'attribute_not_exists(id)', // This ensures the item is only written if no item with the same id exists
                        })
                    );
                    body = requestJSON;
                } catch (error) {
                    body = error;
                    statusCode = 500;
                }
                break;

            case 'GET /posts/of/{subjectCode}': // Get posts of a specific subject
                try {
                    const { Items } = await dynamo.send(
                        new ScanCommand({
                            TableName: tableName,
                            FilterExpression: 'subjectCode = :subjectCode',
                            ExpressionAttributeValues: {
                                ':subjectCode': event.pathParameters.subjectCode
                            }
                        })
                    );
                    body = Items;
                } catch (error) {
                    body = error;
                    statusCode = 500;
                }
                break;


            case "GET /posts": // Read all posts
                body = await dynamo.send(
                    new ScanCommand({ TableName: tableName })
                );
                body = body.Items;
                break;

            case "GET /posts/search/{val}": // Search posts by value
                let searchVal = event.pathParameters.val; // Get the search value from the path parameter
                try {
                    let data = await dynamo.send(
                        new ScanCommand({
                            TableName: tableName,
                            FilterExpression: "contains(title, :val)",
                            ExpressionAttributeValues: {
                                ":val": searchVal
                            }
                        })
                    );
                    body = data.Items; // The array of posts
                } catch (error) {
                    body = error;
                    statusCode = 500;
                }
                break;

            case "GET /users/{userId}/posts": // Get posts by user
                let userId = event.pathParameters.userId;
                try {
                    let data = await dynamo.send(
                        new QueryCommand({
                            TableName: tableName,
                            IndexName: "creatorId-index",
                            KeyConditionExpression: "creatorId = :userId",
                            ExpressionAttributeValues: {
                                ":userId": userId
                            }
                        })
                    );
                    body = data.Items;
                } catch (error) {
                    body = 'Error while getting posts';
                    statusCode = 500;
                }
                break;

            case "GET /users/{userId}/posts/filter/{type}": // Get posts by user with filter
                let creatorId = event.pathParameters.userId;
                let type = event.pathParameters.type;
                let params;

                if (type === 'All') {
                    params = {
                        TableName: tableName,
                        IndexName: "creatorId-index",
                        KeyConditionExpression: "creatorId = :userId",
                        ExpressionAttributeValues: {
                            ":userId": creatorId
                        }
                    };
                } else {
                    params = {
                        TableName: tableName,
                        IndexName: "creatorId-index",
                        KeyConditionExpression: "creatorId = :userId",
                        FilterExpression: "#post_status = :type",
                        ExpressionAttributeValues: {
                            ":userId": creatorId,
                            ":type": type
                        },
                        ExpressionAttributeNames: {
                            "#post_status": "status"
                        }
                    };
                }

                try {
                    let data = await dynamo.send(new QueryCommand(params));
                    body = data.Items;
                } catch (error) {
                    body = error;
                    statusCode = 500;
                }
                break;

            case 'GET /posts/{id}': // Read a single post
                try {
                    body = await dynamo.send(
                        new GetCommand({
                            TableName: tableName,
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

            case 'PATCH /posts/{id}': // Update post
                let newData = JSON.parse(event.body);
                let patchId = event.pathParameters.id;

                const updatePostCommand = {
                    TableName: tableName,
                    Key: {
                        id: `${patchId}`
                    },
                    UpdateExpression: 'SET #subjectCode = :subjectCode, #department = :department, #title = :title, #description = :description, #creatorId = :creatorId, #cover = :cover, #createAt = :createAt, #updatedAt = :updatedAt, #content = :content, #status = :status, #liked = :liked, #commentIds = :commentIds, #shared = :shared, #viewed = :viewed',
                    ExpressionAttributeNames: {
                        '#subjectCode': 'subjectCode',
                        '#department': 'department',
                        '#title': 'title',
                        '#description': 'description',
                        '#creatorId': 'creatorId',
                        '#cover': 'cover',
                        '#createAt': 'createAt',
                        '#updatedAt': 'updatedAt',
                        '#content': 'content',
                        '#status': 'status',
                        '#liked': 'liked',
                        '#commentIds': 'commentIds',
                        '#shared': 'shared',
                        '#viewed': 'viewed'
                    },
                    ExpressionAttributeValues: {
                        ':subjectCode': newData.subjectCode,
                        ':department': newData.department,
                        ':title': newData.title,
                        ':description': newData.description,
                        ':creatorId': newData.creatorId,
                        ':cover': newData.cover,
                        ':createAt': newData.createAt,
                        ':updatedAt': newData.updatedAt,
                        ':content': newData.content,
                        ':status': newData.status,
                        ':liked': newData.liked,
                        ':commentIds': newData.commentIds,
                        ':shared': newData.shared,
                        ':viewed': newData.viewed
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

            case 'PUT /posts/{id}/reaction':
                try {
                    // Read the item from the table
                    const getResult = await dynamo.send(
                        new GetCommand({
                            TableName: tableName,
                            Key: {
                                id: event.pathParameters.id,
                            },
                        })
                    );

                    let listLiked = [...getResult.Item.liked];

                    let index = listLiked.indexOf(JSON.parse(event.body).userId);

                    if (index !== -1) {
                        listLiked.splice(index, 1);
                    } else {
                        listLiked.push(JSON.parse(event.body).userId);
                    }

                    // Write back the modified item
                    const updatePostCommand = {
                        TableName: tableName,
                        Key: {
                            id: `${event.pathParameters.id}`
                        },
                        UpdateExpression: 'SET #liked = :liked',
                        ExpressionAttributeNames: {
                            '#liked': 'liked'
                        },
                        ExpressionAttributeValues: {
                            ':liked': listLiked
                        }
                    };

                    try {
                        await dynamo.send(
                            new UpdateCommand(updatePostCommand)
                        );
                        body = index;
                    } catch (error) {
                        statusCode = 500;
                        body = error;
                    }
                } catch (error) {
                    body = error;
                }
                break;

            case 'PUT /posts/{id}/approve':
                try {
                    // Determine the new status based on the accept parameter
                    const newStatus = JSON.parse(event.body).accept ? 'published' : 'rejected';

                    // Write back the modified item
                    const updatePostCommand = {
                        TableName: tableName,
                        Key: {
                            id: `${event.pathParameters.id}`
                        },
                        UpdateExpression: 'SET #status = :status',
                        ExpressionAttributeNames: {
                            '#status': 'status'
                        },
                        ExpressionAttributeValues: {
                            ':status': newStatus
                        }
                    };

                    try {
                        await dynamo.send(
                            new UpdateCommand(updatePostCommand)
                        );
                        body = newStatus;
                    } catch (error) {
                        statusCode = 500;
                        body = error;
                    }
                } catch (error) {
                    body = error;
                }
                break;

            case "DELETE /posts/{id}": // Delete post
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