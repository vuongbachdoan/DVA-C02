import boto3
import json

def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb')
    users_table = dynamodb.Table('theguide-users')
    subjects_table = dynamodb.Table('theguide-subjects')
    ses = boto3.client('ses')
    
    for record in event['Records']:
            new_image = record['dynamodb']['NewImage']
            creatorId = new_image['creatorId']['S']
            title = new_image['title']['S']
            subjectCode = new_image['subjectCode']['S']
            status = new_image['status']['S']
            
            # Get the subject from the DynamoDB table
            response = subjects_table.get_item(
                Key={
                    'subjectCode': subjectCode
                }
            )
            subject = response['Item']
            lectureIds = subject['lectureIds']
            studentIds = subject['studentIds']
            
            if status == 'pending':
                # Get the users from the DynamoDB table and send emails
                for lectureId in lectureIds:
                    response = users_table.get_item(
                        Key={
                            'id': lectureId
                        }
                    )
                    user = response['Item']
                    email = user['email']
                    
                    # Send the email
                    response = ses.send_email(
                        Source='rapifycloud@gmail.com',
                        Destination={
                            'ToAddresses': [
                                email,
                            ],
                        },
                        Message={
                            'Subject': {
                                'Data': 'The Guide - New post has been created!',
                            },
                            'Body': {
                                'Text': {
                                    'Data': 'Hey ' + user['username'] + ',\n\nJust wanted to let you know that a new post titled "' + title + '" has been added in subject ' + subjectCode + '.\n\nYou can check out the post right here: https://www.docs.rapify-cloud.com/subject/detail/' + subjectCode + '\n\nFeel free to jump in, share your thoughts, or give some feedback. It\'s always great to see what the students are up to!\n\nCatch you later,\nThe Guide Team',
                                },
                            },
                        },
                    )
    return {
        'statusCode': 200,
        'body': json.dumps('Email sent!')
    }
