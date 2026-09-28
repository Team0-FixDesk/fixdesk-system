<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('title_name', function (Blueprint $table) {
            $table->increments('ttn_id');
            $table->string('ttn_title_th', 50);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('title_name');
    }
};
