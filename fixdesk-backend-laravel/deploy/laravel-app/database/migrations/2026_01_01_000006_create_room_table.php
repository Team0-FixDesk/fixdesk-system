<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room', function (Blueprint $table) {
            $table->increments('room_id');
            $table->string('room_name', 255);
            $table->unsignedInteger('room_fl_id');

            $table->foreign('room_fl_id')->references('fl_id')->on('floor')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room');
    }
};
