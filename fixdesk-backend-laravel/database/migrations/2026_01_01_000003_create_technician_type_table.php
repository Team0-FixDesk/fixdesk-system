<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('technician_type', function (Blueprint $table) {
            $table->increments('tt_id');
            $table->string('tt_name', 100);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('technician_type');
    }
};
