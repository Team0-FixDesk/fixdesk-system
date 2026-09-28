<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->increments('ct_id');
            $table->string('ct_name', 150);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
