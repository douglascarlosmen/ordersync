<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use GuzzleHttp\Client;

class GatewayController extends Controller
{
    public function forwardOrder(Request $request)
    {
        $client = new Client();

        try {
            $response = $client->post('http://order-service/api/orders', [
                'json' => $request->all(),
            ]);

            $body = json_decode($response->getBody(), true);
            return response()->json($body, $response->getStatusCode());

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Internal forwarding failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
