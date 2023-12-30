import boto3
import json

def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb')
    users_table = dynamodb.Table('theguide-users')
    subjects_table = dynamodb.Table('theguide-subjects')
    ses = boto3.client('ses')
    
    for record in event['Records']:
        if record['eventName'] == 'INSERT':
            new_image = record['dynamodb']['NewImage']
            title = new_image['title']['S']
            subjectCode = new_image['subjectCode']['S']
            createdAt = new_image['createdAt']['S'] # assuming createdAt is in the new_image
            
            # Get the subject from the DynamoDB table
            response = subjects_table.get_item(
                Key={
                    'subjectCode': subjectCode
                }
            )
            subject = response['Item']
            lectureIds = subject['lectureIds'] # assuming lectureIds is in the subject
            
            # For each lectureId, get the user and send the email
            for lectureId in lectureIds:
                response = users_table.get_item(
                    Key={
                        'id': lectureId
                    }
                )
                user = response['Item']
                email = user['email']
                
                # Prepare the email data
                data = json.dumps(new_image, indent=2)
                
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
                                'Data': 'Hey ' + user['username'] + ',\n\nJust wanted to let you know that a new post titled "' + title + '" has been added in subject ' + subjectCode + '.\n\nYou can check out the post right here: https://www.docs.rapify-cloud.com/posts/detail/' + new_image['id']['S'] + '\n\nFeel free to jump in, share your thoughts, or give some feedback. It\'s always great to see what the students are up to!\n\nCatch you later,\nThe Guide Team',
                            },
                        },
                    },
                )
    return {
        'statusCode': 200,
        'body': json.dumps('Email sent!')
    }
