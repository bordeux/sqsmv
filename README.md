# sqsmv

Move all messages from one SQS queue, to another.


## Installation

### Source

    npm install -g @bordeux/sqsmv


## Configuration

No configurations. Script reading secrets directly from ENV or from AWS cli configuration. You can control script by official AWS Environment variables like:  `AWS_SECRET_ACCESS_KEY`, `AWS_ACCESS_KEY_ID` ,`AWS_REGION` or just `AWS_PROFILE`


## Usage

    Usage: sqsmv -s [string] -d [string] -p [num]
    
    Options:
      --help             Show help                                         [boolean]
      --version          Show version number                               [boolean]
      -s, --source       Source queue (name or url)                       [required]
      -d, --destination  Destination queue (name or url)                  [required]
      -p, --parallel                                        [required] [default: 10]
    
    Examples:
      sqsmv -s main_dead -d main  Move messages from main_dead back to main queue

Supply source and destination URL endpoints.

    sqsmv -s https://region.queue.amazonaws.com/123/queue-a -d https://region.queue.amazonaws.com/123/queue-b

or

    sqsmv -s queue-a -d queue-b

## Seeing is believing :)

Create some SQS messages to play with using the AWS CLI.

    for i in {0..24..1}; do
        aws sqs send-message \
            --queue-url https://ap-southeast-2.queue.amazonaws.com/123/wat-a
            --message-body "{\"id\": $i}"
    done

## Thank you
Thank you for [SQSmv implementation in go](https://github.com/scottjbarr/sqsmv)

## License

The MIT License (MIT)

Copyright (c) Chris Bednarczyk

See [LICENSE.md](LICENSE.md)