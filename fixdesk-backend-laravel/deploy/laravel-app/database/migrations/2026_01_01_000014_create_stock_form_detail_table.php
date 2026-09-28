<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_form_detail', function (Blueprint $table) {
            $table->increments('sfd_id');
            $table->unsignedInteger('sfd_sf_id');
            $table->unsignedInteger('sfd_pd_id');
            $table->integer('sfd_qty')->default(0);
            // หมายเหตุ: ต้นฉบับ Node ไม่เคยส่ง sfd_type ตอน insert withdraw/waiting เลย
            // (เซ็ตแค่ตอน insert แถว return) แปลว่า DB เดิมต้องมี default เป็น 'withdraw'
            // ไม่งั้น CASE WHEN sfd_type = 'withdraw' ใน getRepairDetail จะไม่ match แถวพวกนี้เลย
            $table->string('sfd_type', 20)->default('withdraw'); // withdraw | return
            $table->string('sfd_status', 20)->default('waiting'); // waiting | approved | rejected | returned

            $table->foreign('sfd_sf_id')->references('sf_id')->on('stock_form')->cascadeOnDelete();
            $table->foreign('sfd_pd_id')->references('pd_id')->on('products')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_form_detail');
    }
};
