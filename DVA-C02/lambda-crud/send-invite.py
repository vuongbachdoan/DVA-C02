import json
import boto3

ses = boto3.client('ses')

def lambda_handler(event, context):

    # Get the recipients list
    event_data = json.loads(event['body'])  # Use json.loads to convert string to dictionary

    recipients = event_data["recipients"]  # Access the recipients from the event_data

    for recipient in recipients:

        # Access name and email from dict 
        name = recipient['name']
        email = recipient['email']

        subject = 'Invitation to Our Upcoming Event'
        content = f"""
        Dear {name},

        I hope this email finds you well. We are Admin team from The Guide. We are excited to announce that we will be hosting an event, The Guide - My Architecture, on 16/11/2023 at https://www.docs.rapify-cloud.com/livestream/view.
        We would be honored if you could join us for this event. Your presence would certainly enhance the experience for our attendees.
        Please find the event details below:
        - **Event:** The Guide - My Architecture
        - **Date:** 16/11/2023
        - **Time:** 21:00
        - **Link to join:** https://www.docs.rapify-cloud.com/livestream/view
        - **URL key to join:** https://0bf28f2401c9.us-east-1.playback.live-video.net/api/video/v1/us-east-1.955228589631.channel.v4c7evGHqxKq.m3u8
        If you have any questions or need further information, please do not hesitate to contact me at rapifycloud@gmail.com or vuong.cloud23@gmail.com.
        We look forward to your positive response and hope to see you at The Guide - My Architecture.

        Best Regards,
        The Guide team
        (Admin)
        rapifycloud@gmail.com
        """

        # Send the email
        ses.send_email(
            Source='rapifycloud@gmail.com', # Replace with your sender address
            Destination={
                'ToAddresses': [email] # The recipient address
            },
            Message={
                'Subject': {
                    'Data': subject # The email subject
                },
                'Body': {
                    'Text': {
                        'Data': content # The email content
                    }
                }
            }
        )
