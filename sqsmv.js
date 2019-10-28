const AWS = require('aws-sdk');
const chunk = require('chunk');
require("array-foreach-async");


module.exports = class Sqsmv {
    constructor() {
        this.sqs = new AWS.SQS({apiVersion: '2012-11-05'});
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

        let data = await this.sqs.getQueueUrl({
            QueueName: name
        }).promise();
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
        let messages = (await this.sqs.receiveMessage({
            QueueUrl: this.source,
            MaxNumberOfMessages: this.maxMessages,
            WaitTimeSeconds: this.waitTimeSeconds
        }).promise()).Messages;
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

        await this.sqs.deleteMessageBatch({
            Entries: messages.map((message) => {
                return {
                    Id: message.MessageId,
                    ReceiptHandle: message.ReceiptHandle,
                }
            }),
            QueueUrl: this.source
        }).promise();

        return messages.length;
    }


    async _sendBulk(messages) {
        try {
            await this.sqs.sendMessageBatch({
                QueueUrl: this.destination,
                Entries: messages
            }).promise();
        } catch (e) {
            if (e.code != "AWS.SimpleQueueService.BatchRequestTooLong" || messages.length <= 1) {
                throw e;
            }

            await chunk(messages, Math.floor(messages.length / 2))
                .forEachAsync(async (items) => await this._sendBulk(items));

        }
    }
};