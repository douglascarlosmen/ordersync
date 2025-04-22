<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GatewayController;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:api')->group(function () {
    Route::post('/orders', [GatewayController::class, 'forwardOrder']);
});
