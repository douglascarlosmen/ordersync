<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use App\PaymentLog;

class ConsumeNotifications extends Command
{
    protected $signature = 'notifications:consume';
    protected $description = 'Consume payment_completed queue and save logs in MongoDB';

    public function handle()
    {
        $connection = new AMQPStreamConnection('rabbitmq', 5672, 'guest', 'guest');
        $channel = $connection->channel();
        $channel->queue_declare('payment_completed', false, true, false, false);

        $callback = function (AMQPMessage $msg) {
            $data = json_decode($msg->body, true);

            PaymentLog::create([
                'order_id' => $data['order_id'],
                'status' => $data['status'],
                'notified_at' => $data['notified_at']
            ]);

            $this->info("Log saved for order ID {$data['order_id']}");
        };

        $channel->basic_consume('payment_completed', '', false, true, false, false, $callback);

        $this->info('Waiting for payment logs...');
        while ($channel->is_consuming()) {
            $channel->wait();
        }

        $channel->close();
        $connection->close();
    }
}
