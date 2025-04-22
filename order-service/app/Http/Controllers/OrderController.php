<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Order;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

class OrderController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product' => 'required|string',
            'quantity' => 'required|integer|min:1',
            'price' => 'required|numeric|min:0',
        ]);

        $order = Order::create($validated);

        // Publicar na fila RabbitMQ
        $connection = new AMQPStreamConnection('rabbitmq', 5672, 'guest', 'guest');
        $channel = $connection->channel();
        $channel->queue_declare('order_created', false, true, false, false);

        $message = new AMQPMessage(json_encode($order->toArray()));
        $channel->basic_publish($message, '', 'order_created');

        $channel->close();
        $connection->close();

        return response()->json($order, 201);
    }
}
