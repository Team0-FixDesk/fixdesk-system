<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->increments('pd_id');
            $table->string('pd_asset_code', 100)->nullable();
            $table->string('pd_name', 255);
            $table->text('pd_detail')->nullable();
            $table->unsignedInteger('pd_category_id')->nullable();
            $table->integer('pd_quantity')->default(0);
            $table->unsignedInteger('pd_unit_id')->nullable();
            $table->string('pd_status', 20)->default('active');
            $table->string('pd_upload_image', 255)->nullable();
            $table->dateTime('pd_updated_at')->nullable();

            $table->foreign('pd_category_id')->references('ct_id')->on('categories')->nullOnDelete();
            $table->foreign('pd_unit_id')->references('units_id')->on('units')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
