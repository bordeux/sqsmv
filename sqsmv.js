const AWS = require('aws-sdk');

module.exports = class Sqsmv {
    constructor(){
        this.sqs = new AWS.SQS({apiVersion: '2012-11-05'});
        this.source = null;
        this.destination = null;
        this.maxMessages = 10;
        this.waitTimeSeconds = 1;
    }

    async setSource(source){
        this.source = await this.getQueueUrl(source);
    }

    async setDestination(destination) {
        this.destination = await this.getQueueUrl(destination);
    }

    async getQueueUrl(name){
        if(name.startsWith('https://')){
            return name;
        }

        let data = await this.sqs.getQueueUrl({
            QueueName: name
        }).promise();
        return data.QueueUrl;
    }

    async tick(){
        let messages = (await this.sqs.receiveMessage({
            QueueUrl: this.source,
            MaxNumberOfMessages: this.maxMessages,
            WaitTimeSeconds: this.waitTimeSeconds
        }).promise()).Messages;
        if(!messages || !messages.length){
            return false;
        }

        await this.sqs.sendMessageBatch({
            QueueUrl: this.destination,
            Entries: messages.map((message) => {
                console.log(message);
                return {
                    Id: message.MessageId,
                    MessageBody: message.Body,
                    MessageAttributes: message.MessageAttributes || {},
                };
            })
        }).promise();

        this.sqs.deleteMessageBatch({
            Entries: messages.map((message) => {
                return {
                    Id: message.MessageId,
                    ReceiptHandle: message.ReceiptHandle,
                }
            }),
            QueueUrl: this.source
        });

        return true;
    }
};