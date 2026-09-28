<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_transactions', function (Blueprint $table) {
            $table->increments('stt_id');
            $table->unsignedInteger('stt_product_id')->nullable();
            $table->unsignedInteger('stt_user_id')->nullable();
            $table->string('stt_type', 10); // IN | OUT
            $table->integer('stt_quantity');
            $table->dateTime('stt_created_at');
            $table->unsignedInteger('stt_ref_sf_id')->nullable();

            // nullOnDelete (ไม่ cascade): deleteProduct() ของเดิมบันทึก transaction OUT
            // ก่อนลบ product แถวเดียวกัน ถ้า cascade จะลบ log ที่เพิ่งบันทึกไปทันทีเช่นกัน
            // ทำให้ audit trail หายไปตั้งแต่ตอนลบ ซึ่งขัดจุดประสงค์ของการบันทึก log
            $table->foreign('stt_product_id')->references('pd_id')->on('products')->nullOnDelete();
            $table->foreign('stt_user_id')->references('us_id')->on('user')->nullOnDelete();
            $table->foreign('stt_ref_sf_id')->references('sf_id')->on('stock_form')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transactions');
    }
};
