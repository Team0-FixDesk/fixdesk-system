<?php

namespace App\Http\Controllers;

use App\Services\ProductImageUploadService;
use App\Services\StockService;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function __construct(
        private StockService $stockService,
        private ProductImageUploadService $imageUpload,
    ) {}

    private function authUserId(Request $request): ?int
    {
        $authUser = $request->attributes->get('authUser');

        return isset($authUser['us_id']) ? (int) $authUser['us_id'] : null;
    }

    public function getAllProducts()
    {
        try {
            return response()->json($this->stockService->getAllProducts());
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงข้อมูลสินค้าไม่สำเร็จ', 'error' => $e->getMessage()], 500);
        }
    }

    public function getAllTransactions()
    {
        try {
            return response()->json($this->stockService->getAllTransactions());
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงข้อมูล transactions ไม่สำเร็จ', 'error' => $e->getMessage()], 500);
        }
    }

    public function addProduct(Request $request)
    {
        $name = $request->input('pd_name');
        $categoryId = $request->input('pd_category_id');
        $quantity = $request->input('pd_quantity');
        $unitId = $request->input('pd_unit_id');

        if (! $name || ! $categoryId || ! $quantity || ! $unitId) {
            return response()->json(['message' => 'กรุณากรอกข้อมูลให้ครบถ้วน'], 400);
        }

        $file = $this->imageUpload->fileFromRequest($request);
        $filename = $file ? $this->imageUpload->store($file) : null;

        try {
            $newId = $this->stockService->addProduct([
                'assetCode' => $request->input('pd_asset_code'),
                'name' => $name,
                'categoryId' => $categoryId,
                'quantity' => (int) $quantity,
                'unitName' => $unitId,
            ], $filename, $this->authUserId($request));

            return response()->json(['message' => 'เพิ่มสินค้าสำเร็จ', 'id' => $newId], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'เพิ่มสินค้าไม่สำเร็จ', 'error' => $e->getMessage()], 500);
        }
    }

    public function updateProduct(Request $request, int $id)
    {
        $file = $this->imageUpload->fileFromRequest($request);
        $newFilename = $file ? $this->imageUpload->store($file) : null;

        try {
            $this->stockService->updateProduct($id, [
                'assetCode' => $request->input('pd_asset_code'),
                'name' => $request->input('pd_name'),
                'detail' => $request->input('pd_detail'),
                'categoryId' => $request->input('pd_category_id'),
                'quantity' => $request->input('pd_quantity'),
                'unitName' => $request->input('pd_unit_id'),
                'status' => $request->input('pd_status'),
            ], $newFilename, $this->authUserId($request));

            return response()->json(['message' => 'แก้ไขสินค้าสำเร็จ']);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'PRODUCT_NOT_FOUND') {
                return response()->json(['message' => 'ไม่พบสินค้า'], 404);
            }

            return response()->json(['message' => 'แก้ไขสินค้าไม่สำเร็จ', 'error' => $e->getMessage()], 500);
        }
    }

    public function deleteProduct(Request $request, int $id)
    {
        try {
            $this->stockService->deleteProduct($id, $this->authUserId($request));

            return response()->json(['message' => 'ลบสินค้าสำเร็จ']);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'PRODUCT_NOT_FOUND') {
                return response()->json(['message' => 'ไม่พบสินค้า'], 404);
            }

            return response()->json(['message' => 'ลบสินค้าไม่สำเร็จ', 'error' => $e->getMessage()], 500);
        }
    }

    public function getCategories()
    {
        try {
            return response()->json($this->stockService->getAllCategories());
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงหมวดหมู่ไม่สำเร็จ'], 500);
        }
    }

    public function addCategory(Request $request)
    {
        $name = trim((string) $request->input('ct_name'));
        if (! $name) {
            return response()->json(['message' => 'กรุณากรอกชื่อหมวดหมู่'], 400);
        }

        try {
            $newId = $this->stockService->addCategory($name);

            return response()->json(['message' => 'เพิ่มหมวดหมู่สำเร็จ', 'ct_id' => $newId], 201);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'DUPLICATE_NAME') {
                return response()->json(['message' => 'ชื่อหมวดหมู่ซ้ำ'], 400);
            }

            return response()->json(['message' => 'เพิ่มหมวดหมู่ไม่สำเร็จ'], 500);
        }
    }

    public function updateCategory(Request $request, int $id)
    {
        $name = trim((string) $request->input('ct_name'));
        if (! $name) {
            return response()->json(['message' => 'กรุณากรอกชื่อหมวดหมู่'], 400);
        }

        try {
            $this->stockService->updateCategory($id, $name);

            return response()->json(['message' => 'แก้ไขหมวดหมู่สำเร็จ']);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'DUPLICATE_NAME' => response()->json(['message' => 'ชื่อหมวดหมู่ซ้ำ'], 400),
                'NOT_FOUND' => response()->json(['message' => 'ไม่พบหมวดหมู่'], 404),
                default => response()->json(['message' => 'แก้ไขหมวดหมู่ไม่สำเร็จ'], 500),
            };
        }
    }

    public function deleteCategory(int $id)
    {
        try {
            $this->stockService->deleteCategory($id);

            return response()->json(['message' => 'ลบหมวดหมู่สำเร็จ']);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'DEPENDENCY_EXISTS' => response()->json(['message' => 'ลบไม่ได้ มีสินค้าในหมวดหมู่นี้'], 400),
                'NOT_FOUND' => response()->json(['message' => 'ไม่พบหมวดหมู่'], 404),
                default => response()->json(['message' => 'ลบหมวดหมู่ไม่สำเร็จ'], 500),
            };
        }
    }

    public function getUnits()
    {
        try {
            return response()->json($this->stockService->getAllUnits());
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงหน่วยนับไม่สำเร็จ'], 500);
        }
    }

    public function getAllStockForms()
    {
        try {
            return response()->json($this->stockService->getStockForms());
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงข้อมูลใบเบิกไม่สำเร็จ'], 500);
        }
    }

    public function getUserStockForms(int $id)
    {
        try {
            return response()->json($this->stockService->getStockForms($id));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงข้อมูลใบเบิกไม่สำเร็จ'], 500);
        }
    }

    public function getStockFormDetail(string $sfCode)
    {
        try {
            return response()->json($this->stockService->getStockFormDetail($sfCode));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'ดึงรายละเอียดไม่สำเร็จ'], 500);
        }
    }

    public function updateItemStatus(Request $request)
    {
        $sfCode = $request->input('sf_code');
        $pdId = $request->input('pd_id');
        $status = $request->input('status');

        if (! $sfCode || ! $pdId || ! in_array($status, ['approved', 'rejected'], true)) {
            return response()->json(['message' => 'ข้อมูลไม่ถูกต้อง'], 400);
        }

        try {
            $result = $this->stockService->updateItemStatus($sfCode, (int) $pdId, $status, $this->authUserId($request));

            return response()->json(array_merge(['message' => 'บันทึกผลการพิจารณาสำเร็จ'], $result));
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'ALREADY_PROCESSED') {
                return response()->json(['message' => 'รายการนี้ถูกดำเนินการไปแล้ว'], 400);
            }

            return response()->json(['message' => 'บันทึกผลไม่สำเร็จ', 'error' => $e->getMessage()], 500);
        }
    }

    public function updateMultipleItemsStatus(Request $request)
    {
        $sfCode = $request->input('sf_code');
        $items = $request->input('items');

        if (! $sfCode || ! is_array($items) || empty($items)) {
            return response()->json(['message' => 'ข้อมูลไม่ถูกต้อง'], 400);
        }

        try {
            $result = $this->stockService->updateMultipleItemsStatus($sfCode, $items, $this->authUserId($request));

            return response()->json(array_merge(['message' => 'บันทึกผลการพิจารณาสำเร็จ'], $result));
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'ALREADY_PROCESSED' => response()->json(['message' => 'รายการนี้ถูกดำเนินการไปแล้ว'], 400),
                'FORM_NOT_FOUND' => response()->json(['message' => 'ไม่พบใบเบิก'], 404),
                default => response()->json(['message' => 'บันทึกผลไม่สำเร็จ', 'error' => $e->getMessage()], 500),
            };
        }
    }

    public function updateFormStatus(Request $request)
    {
        $sfCode = $request->input('sf_code');
        $status = $request->input('status');

        try {
            $affected = $this->stockService->updateFormStatus($sfCode, $status);
            if ($affected === 0) {
                return response()->json(['message' => 'ไม่พบใบเบิก'], 404);
            }

            return response()->json(['message' => 'อัปเดตสถานะสำเร็จ', 'sf_status' => $status]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'อัปเดตสถานะไม่สำเร็จ'], 500);
        }
    }

    public function importStock(Request $request)
    {
        $items = $request->input('items');
        if (! is_array($items) || empty($items)) {
            return response()->json(['message' => 'ไม่มีข้อมูลสำหรับ Import'], 400);
        }

        try {
            return response()->json($this->stockService->importStock($items, $this->authUserId($request)));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Import ล้มเหลว', 'error' => $e->getMessage()], 500);
        }
    }

    public function returnItem(Request $request)
    {
        $sfCode = $request->input('sf_code');
        $pdId = $request->input('pd_id');
        $quantity = $request->input('quantity');

        if (! $quantity || $quantity <= 0) {
            return response()->json(['message' => 'จำนวนไม่ถูกต้อง'], 400);
        }

        try {
            $this->stockService->returnItem($sfCode, (int) $pdId, (float) $quantity, $this->authUserId($request));

            return response()->json(['message' => 'คืนอุปกรณ์สำเร็จ']);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
