<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('floor', function (Blueprint $table) {
            $table->increments('fl_id');
            $table->string('fl_name', 255);
            $table->unsignedInteger('fl_bd_id');

            $table->foreign('fl_bd_id')->references('bd_id')->on('building')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('floor');
    }
};
