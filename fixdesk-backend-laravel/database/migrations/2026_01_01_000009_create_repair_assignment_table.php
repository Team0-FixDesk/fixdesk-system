<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('repair_assignment', function (Blueprint $table) {
            $table->increments('ra_id');
            $table->unsignedInteger('ra_rf_id');
            $table->unsignedInteger('ra_us_id');
            $table->boolean('ra_is_lead')->default(0);
            $table->dateTime('ra_assigned_at')->nullable();
            $table->unsignedInteger('ra_assigned_by')->nullable();
            $table->dateTime('ra_accepted_at')->nullable();

            $table->foreign('ra_rf_id')->references('rf_id')->on('repair_form')->cascadeOnDelete();
            $table->foreign('ra_us_id')->references('us_id')->on('user')->restrictOnDelete();
            $table->foreign('ra_assigned_by')->references('us_id')->on('user')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('repair_assignment');
    }
};
