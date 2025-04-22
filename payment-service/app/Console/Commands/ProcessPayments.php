<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use App\Payment;

class ProcessPayments extends Command
{
    protected $signature = 'payments:consume';
    protected $description = 'Consume order_created queue and process payments';

    public function handle()
    {
        $connection = new AMQPStreamConnection('rabbitmq', 5672, 'guest', 'guest');
        $channel = $connection->channel();

        $channel->queue_declare('order_created', false, true, false, false);

        $callback = function (AMQPMessage $msg) {
            $order = json_decode($msg->body, true);

            Payment::create([
                'order_id' => $order['id'],
                'status' => 'paid'
            ]);

            $this->info("Processed payment for order ID {$order['id']}");
        };

        $channel->basic_consume('order_created', '', false, true, false, false, $callback);

        $this->info('Waiting for messages. To exit press CTRL+C');
        while ($channel->is_consuming()) {
            $channel->wait();
        }

        $channel->close();
        $connection->close();
    }
}
