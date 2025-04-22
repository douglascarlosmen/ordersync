<?php

namespace App;

use Jenssegers\Mongodb\Eloquent\Model;

class PaymentLog extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'payment_logs';
    protected $fillable = ['order_id', 'status', 'notified_at'];
}
