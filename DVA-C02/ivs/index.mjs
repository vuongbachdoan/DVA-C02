import AWS from 'aws-sdk';
const ivs = new AWS.IVS();

export const handler = async (event) => {
    const bodyJSON = JSON.parse(event.body);
    const params = {
        channelArn: 'arn:aws:ivschat:us-east-1:955228589631:room/yUc5M1gI0BxC', // replace with your Channel ARN
        permissions: ['SEND_MESSAGE'],
        username: bodyJSON.username
    };

    try {
        const data = await ivs.createPlaybackKeyPair(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({
                token: data.token
            }),
        };
    } catch (err) {
        return err;
    }
};
