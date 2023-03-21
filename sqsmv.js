const { SQSClient, ReceiveMessageCommand, DeleteMessageBatchCommand, SendMessageBatchCommand, GetQueueUrlCommand } = require('@aws-sdk/client-sqs');
const chunk = require('chunk');
require("array-foreach-async");


module.exports = class Sqsmv {
    constructor() {
        this.sqs = new SQSClient({});
        this.source = null;
        this.destination = null;
        this.maxMessages = 10;
        this.waitTimeSeconds = 0;
    }

    async setSource(source) {
        this.source = await this.getQueueUrl(source);
    }

    async setDestination(destination) {
        this.destination = await this.getQueueUrl(destination);
    }

    async getQueueUrl(name) {
        if (name.startsWith('https://')) {
            return name;
        }

        const data = await this.sqs.send(new GetQueueUrlCommand({
            QueueName: name
        }));
        return data.QueueUrl;
    }

    async tick(parallel) {
        let items = [];
        for (let i = 0; i < parallel; i++) {
            items.push(this.process());
        }

        return (await Promise.all(items))
            .reduce((total, current) => total + current);
    }

    async process() {
        const result = await this.sqs.send(new ReceiveMessageCommand({
            QueueUrl: this.source,
            MaxNumberOfMessages: this.maxMessages,
            WaitTimeSeconds: this.waitTimeSeconds
        }));
        const messages = result.Messages;
        if (!messages || !messages.length) {
            return 0;
        }

        await this._sendBulk(messages.map((message) => {
            return {
                Id: message.MessageId,
                MessageBody: message.Body,
                MessageAttributes: message.MessageAttributes || {},
            };
        }));

        await this.sqs.send(new DeleteMessageBatchCommand({
            Entries: messages.map((message) => {
                return {
                    Id: message.MessageId,
                    ReceiptHandle: message.ReceiptHandle,
                }
            }),
            QueueUrl: this.source
        }));

        return messages.length;
    }


    async _sendBulk(messages) {
        try {
            await this.sqs.send(new SendMessageBatchCommand({
                QueueUrl: this.destination,
                Entries: messages
            }))
        } catch (e) {
            if (e.message !== "BatchRequestTooLong" || messages.length <= 1) {
                throw e;
            }

            await chunk(messages, Math.floor(messages.length / 2))
                .forEachAsync(async (items) => await this._sendBulk(items));

        }
    }
};