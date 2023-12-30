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
const tableName = "theguide-subjects";

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
            case "POST /subjects": // Create subject
                let requestJSON = JSON.parse(event.body);
                try {
                    /**
                     * 
                     * @param {*} data 
                     * subjectCode: requestJSON.subjectCode,
                     * subjectName: requestJSON.subjectName,
                     * thumbnail: requestJSON.thumbnail,
                     * studentIds: requestJSON.studentIds,
                     * lectureIds: requestJSON.lectureIds,
                     * department: requestJSON.department,
                     * postIds: requestJSON.postIds,
                     * createAt: requestJSON.createAt,
                     * @returns 
                     */
                    await dynamo.send(
                        new PutCommand({
                            TableName: tableName,
                            Item: {
                                subjectCode: requestJSON.subjectCode,
                                subjectName: requestJSON.subjectName,
                                thumbnail: requestJSON.thumbnail,
                                studentIds: requestJSON.studentIds,
                                lectureIds: requestJSON.lectureIds,
                                department: requestJSON.department,
                                postIds: requestJSON.postIds,
                                createAt: requestJSON.createAt
                            },
                            ConditionExpression: 'attribute_not_exists(subjectCode)', // This ensures the item is only written if no item with the same id exists
                        })
                    );
                    body = requestJSON;
                } catch (error) {
                    body = 'Error while create post';
                    statusCode = 500;
                }
                break;

            case "GET /subjects": // Read all subject
                body = await dynamo.send(
                    new ScanCommand({ TableName: tableName })
                );
                body = body.Items;
                break;

            case 'GET /subjects/{id}': // Read a single subject
                try {
                    body = await dynamo.send(
                        new GetCommand({
                            TableName: tableName,
                            Key: {
                                subjectCode: event.pathParameters.id
                            }
                        })
                    );
                    body = body.Item;
                } catch {
                    statusCode = 404;
                    body = null;
                }
                break;

            case 'GET /subjects/joined/{userId}': // Get subjects user joined
                let userId = event.pathParameters.userId;

                try {
                    let scanResults = await dynamo.send(new ScanCommand({ TableName: tableName }));
                    let joinedSubjects = scanResults.Items.filter(subject =>
                        subject.studentIds.includes(userId) || subject.lectureIds.includes(userId)
                    );

                    body = joinedSubjects;
                } catch {
                    statusCode = 500;
                    body = "Failed to get subjects";
                }
                break;


            case 'PUT /subjects/{id}': // Join subject
                let participant = JSON.parse(event.body);
                let subjectCode = event.pathParameters.id;
                let joinType = (participant.email === 'vuongbachdoan@gmail.com' || /^[a-zA-Z0-9._%+-]+@fe\.edu\.vn$/.test(participant.email)) ? 'lectureIds' : 'studentIds';
                let updateExpression = `SET ${joinType} = list_append(${joinType}, :i)`;

                try {
                    await dynamo.send(
                        new UpdateCommand({
                            TableName: tableName,
                            Key: {
                                subjectCode: subjectCode, // Use 'subjectCode' as the key
                            },
                            UpdateExpression: updateExpression,
                            ExpressionAttributeValues: {
                                ':i': [participant.id],
                            },
                        })
                    );
                    body = participant; // Return the participant data
                } catch {
                    statusCode = 500;
                    body = "Failed to update subject";
                }
                break;

            case 'PATCH /subjects/{id}': // Update subject
                let newData = JSON.parse(event.body);
                let patchId = event.pathParameters.id;

                const updateSubjectCommand = {
                    TableName: tableName,
                    Key: {
                        id: `${patchId}`
                    },
                    UpdateExpression: 'SET #subjectCode = :subjectCode, #subjectName = :subjectName, #thumbnail = :thumbnail, #studentIds = :studentIds, #lectureIds = :lectureIds, #department = :department, #postIds = :postIds, #createAt = :createAt',
                    ExpressionAttributeNames: {
                        '#subjectCode': 'subjectCode',
                        '#subjectName': 'subjectName',
                        '#thumbnail': 'thumbnail',
                        '#studentIds': 'studentIds',
                        '#lectureIds': 'lectureIds',
                        '#department': 'department',
                        '#postIds': 'postIds',
                        '#createAt': 'createAt'
                    },
                    ExpressionAttributeValues: {
                        ':subjectCode': newData.subjectCode,
                        ':subjectName': newData.subjectName,
                        ':thumbnail': newData.thumbnail,
                        ':studentIds': newData.studentIds,
                        ':lectureIds': newData.lectureIds,
                        ':department': newData.department,
                        ':postIds': newData.postIds,
                        ':createAt': newData.createAt
                    }
                };

                try {
                    await dynamo.send(
                        new UpdateCommand(updateSubjectCommand)
                    );
                    body = newData;
                } catch {
                    statusCode = 500;
                    body = "Failed to update subject";
                }
                break;

            case 'DELETE /subjects/{id}/leave/{userId}':
                try {
                    // Read the item from the table
                    const getResult = await dynamo.send(
                        new GetCommand({
                            TableName: tableName,
                            Key: {
                                subjectCode: event.pathParameters.id,
                            },
                        })
                    );

                    let studentIds = [...getResult.Item.studentIds];
                    let lectureIds = [...getResult.Item.lectureIds];

                    let indexStudent = studentIds.indexOf(event.pathParameters.userId);
                    let indexLecture = lectureIds.indexOf(event.pathParameters.userId);

                    if (indexStudent !== -1) {
                        studentIds.splice(indexStudent, 1);

                        // Write back the modified item
                        const updateSubjectCommand = {
                            TableName: tableName,
                            Key: {
                                subjectCode: `${event.pathParameters.id}`
                            },
                            UpdateExpression: 'SET #studentIds = :studentIds',
                            ExpressionAttributeNames: {
                                '#studentIds': 'studentIds'
                            },
                            ExpressionAttributeValues: {
                                ':studentIds': [...studentIds]
                            }
                        };

                        try {
                            let updatedData = await dynamo.send(
                                new UpdateCommand(updateSubjectCommand)
                            );
                            body = updatedData;
                        } catch {
                            statusCode = 500;
                            body = "Failed to update subject";
                        }
                    } else if (indexLecture !== -1) {
                        lectureIds.splice(indexLecture, 1);

                        // Write back the modified item
                        const updateSubjectCommand = {
                            TableName: tableName,
                            Key: {
                                subjectCode: `${event.pathParameters.id}`
                            },
                            UpdateExpression: 'SET #lectureIds = :lectureIds',
                            ExpressionAttributeNames: {
                                '#lectureIds': 'lectureIds'
                            },
                            ExpressionAttributeValues: {
                                ':lectureIds': [...lectureIds]
                            }
                        };

                        try {
                            let updatedData = await dynamo.send(
                                new UpdateCommand(updateSubjectCommand)
                            );
                            body = updatedData;
                        } catch {
                            statusCode = 500;
                            body = "Failed to update subject";
                        }
                    } else {
                        statusCode = 404;
                        body = 'Not Found!';
                    }


                } catch (error) {
                    body = 'ERROR';
                }
                break;

            case "DELETE /subjects/{id}": // Delete post
                await dynamo.send(
                    new DeleteCommand({
                        TableName: tableName,
                        Key: {
                            subjectCode: event.pathParameters.id
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