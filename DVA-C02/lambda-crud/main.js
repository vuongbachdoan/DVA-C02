import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    ScanCommand,
    PutCommand,
    DeleteCommand,
    UpdateCommand,
    GetCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const tableName = "theguide-users";

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
            case "POST /users": // Create user
                let requestJSON = JSON.parse(event.body);
                try {
                    await dynamo.send(
                        new PutCommand({
                            TableName: tableName,
                            Item: {
                                id: requestJSON.id,
                                username: requestJSON.username,
                                email: requestJSON.email,
                                avatar: requestJSON.avatar,
                                github: requestJSON.github,
                                linkedin: requestJSON.linkedin,
                                website: requestJSON.website,
                                phone: requestJSON.phone,
                                userCode: requestJSON.userCode,
                                subjects: requestJSON.subjects,
                                role: requestJSON.role,
                            },
                            ConditionExpression: 'attribute_not_exists(id)', // This ensures the item is only written if no item with the same id exists
                        })
                    );
                    body = requestJSON;
                } catch (error) {
                    body = 'User already exist';
                    statusCode = 409;
                }
                break;

            case "GET /users": // Read all users
                body = await dynamo.send(
                    new ScanCommand({ TableName: tableName })
                );
                body = body.Items;
                break;

            case 'GET /users/{id}': // Read a single user
                let getId = event.pathParameters.id;
                try {
                    body = await dynamo.send(
                        new GetCommand({
                            TableName: tableName,
                            Key: { id: getId }
                        })
                    );
                    body = body.Item;
                } catch {
                    statusCode = 404;
                    body = null;
                }
                break;

            case 'PATCH /users/{id}': // Update user
                let patchId = event.pathParameters.id;
                let newData = JSON.parse(event.body);

                const updateStatusCommand = {
                    TableName: tableName,
                    Key: {
                        id: `${patchId}`
                    },
                    UpdateExpression: 'SET #username = :username, #email = :email, #avatar = :avatar, #github = :github, #linkedin = :linkedin, #website = :website, #phone = :phone, #userCode = :userCode, #subjects = :subjects, #role = :role',
                    ExpressionAttributeNames: {
                        '#username': 'username',
                        '#email': 'email',
                        '#avatar': 'avatar',
                        '#github': 'github',
                        '#linkedin': 'linkedin',
                        '#website': 'website',
                        '#phone': 'phone',
                        '#userCode': 'userCode',
                        '#subjects': 'subjects',
                        '#role': 'role',
                    },
                    ExpressionAttributeValues: {
                        ':username': newData.username,
                        ':email': newData.email,
                        ':avatar': newData.avatar,
                        ':github': newData.github,
                        ':linkedin': newData.linkedin,
                        ':website': newData.website,
                        ':phone': newData.phone,
                        ':userCode': newData.userCode,
                        ':subjects': newData.subjects,
                        ':role': newData.role
                    }
                };

                try {
                    await dynamo.send(
                        new UpdateCommand(updateStatusCommand)
                    );
                    body = newData;
                } catch {
                    statusCode = 500;
                    body = "Fail to update user";
                }
                break;

                case 'DELETE /users/{id}/leave/{subjectCode}':
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
                
                        let subjects = [...getResult.Item.subjects];
                
                        let index = subjects.indexOf(event.pathParameters.subjectCode);
                
                        if (index !== -1) {
                            subjects.splice(index, 1);
                
                            // Write back the modified item
                            const updateUserCommand = {
                                TableName: tableName,
                                Key: {
                                    id: `${event.pathParameters.id}`
                                },
                                UpdateExpression: 'SET #subjects = :subjects',
                                ExpressionAttributeNames: {
                                    '#subjects': 'subjects'
                                },
                                ExpressionAttributeValues: {
                                    ':subjects': subjects
                                }
                            };
                
                            try {
                                let updatedData = await dynamo.send(
                                    new UpdateCommand(updateUserCommand)
                                );
                                body = updatedData;
                            } catch {
                                statusCode = 500;
                                body = "Failed to update user";
                            }
                        } else {
                            statusCode = 404;
                            body = 'Subject not found in user';
                        }
                    } catch (error) {
                        body = 'ERROR';
                    }
                    break;

            case "DELETE /users/{id}": // Delete user
                await dynamo.send(
                    new DeleteCommand({
                        TableName: tableName,
                        Key: {
                            id: event.pathParameters.id,
                        },
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