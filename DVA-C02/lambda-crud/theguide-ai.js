// Import the BedrockRuntimeClient and InvokeModelCommand from the AWS SDK
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Initialize the BedrockRuntimeClient
const client = new BedrockRuntimeClient({ region: "us-east-1" });

// Define the AWS Lambda handler
exports.handler = async (event) => {
    // Construct the input for the InvokeModelCommand
    const input = {
        modelId: "ai21.j2-mid-v1",
        contentType: "application/json",
        accept: "*/*",
        body: JSON.stringify({
            prompt: event.prompt,
            maxTokens: 200,
            temperature: 0.7,
            topP: 1,
            stopSequences: [],
            countPenalty: { scale: 0 },
            presencePenalty: { scale: 0 },
            frequencyPenalty: { scale: 0 }
        })
    };

    // Invoke the model and handle the response
    try {
        const data = await client.send(new InvokeModelCommand(input));
        const jsonString = Buffer.from(data.body).toString('utf8');
        const parsedData = JSON.parse(jsonString);
        const text = parsedData.completions[0].data.text;
        console.log('text', text);
        return text;
    } catch (error) {
        console.error(error);
    }
};
