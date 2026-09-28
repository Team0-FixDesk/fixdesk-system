<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user', function (Blueprint $table) {
            $table->increments('us_id');
            $table->string('us_user_name', 100)->unique();
            $table->string('us_user_pass', 255);
            $table->unsignedInteger('us_ttn_id')->nullable();
            $table->string('us_first_name_th', 150)->nullable();
            $table->string('us_last_name_th', 150)->nullable();
            $table->string('us_first_name_en', 150)->nullable();
            $table->string('us_last_name_en', 150)->nullable();
            $table->string('us_phone', 30)->nullable();
            $table->string('us_department', 150)->nullable();
            $table->unsignedInteger('us_role_id');
            $table->unsignedInteger('us_tt_id')->nullable();
            $table->string('us_job_title', 150)->nullable();
            $table->boolean('us_active')->default(1);

            $table->foreign('us_ttn_id')->references('ttn_id')->on('title_name')->nullOnDelete();
            $table->foreign('us_role_id')->references('role_id')->on('role')->restrictOnDelete();
            $table->foreign('us_tt_id')->references('tt_id')->on('technician_type')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user');
    }
};
