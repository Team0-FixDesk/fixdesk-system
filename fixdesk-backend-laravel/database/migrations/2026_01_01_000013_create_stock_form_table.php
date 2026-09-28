<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_form', function (Blueprint $table) {
            $table->increments('sf_id');
            $table->string('sf_code', 30)->unique();
            $table->string('sf_status', 20)->default('waiting');
            $table->dateTime('sf_create_at');
            $table->dateTime('sf_update_at')->nullable();
            $table->unsignedInteger('sf_us_id')->nullable();
            $table->unsignedInteger('sf_rf_id')->nullable();

            $table->foreign('sf_us_id')->references('us_id')->on('user')->nullOnDelete();
            $table->foreign('sf_rf_id')->references('rf_id')->on('repair_form')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_form');
    }
};
