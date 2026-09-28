<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('repair_form', function (Blueprint $table) {
            $table->increments('rf_id');
            $table->string('rf_code', 30)->unique();
            $table->unsignedInteger('rf_us_id');
            $table->unsignedInteger('rf_tt_id')->nullable();
            $table->unsignedInteger('rf_room_id')->nullable();
            $table->string('rf_prop_number', 100)->nullable();
            $table->string('rf_problem', 255);
            $table->text('rf_detail')->nullable();
            $table->string('rf_phone', 30)->nullable();
            $table->string('rf_urgency', 20)->default('medium');
            $table->text('rf_image')->nullable();

            // Location snapshot (ชื่อสถานที่ ณ เวลาที่สร้างใบแจ้งซ่อม)
            $table->string('rf_building_snapshot', 255)->nullable();
            $table->string('rf_floor_snapshot', 255)->nullable();
            $table->string('rf_room_snapshot', 255)->nullable();

            $table->string('rf_user_status', 20)->default('pending');
            $table->dateTime('rf_create_at');
            $table->dateTime('rf_update_at')->nullable();
            $table->dateTime('rf_in_process_at')->nullable();
            $table->dateTime('rf_done_at')->nullable();

            // ผลการซ่อม (บันทึกโดยช่างตอนปิดงาน)
            $table->string('rf_repair_method', 100)->nullable();
            $table->text('rf_repair_method_remark')->nullable();
            $table->string('rf_result_status', 30)->nullable();
            $table->text('rf_result_remark')->nullable();
            $table->text('rf_tech_summary')->nullable();
            $table->text('rf_tech_image_after')->nullable();

            $table->foreign('rf_us_id')->references('us_id')->on('user')->restrictOnDelete();
            $table->foreign('rf_tt_id')->references('tt_id')->on('technician_type')->nullOnDelete();
            $table->foreign('rf_room_id')->references('room_id')->on('room')->nullOnDelete();

            $table->index(['rf_building_snapshot', 'rf_floor_snapshot', 'rf_room_snapshot'], 'idx_rf_location_snapshot');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('repair_form');
    }
};
