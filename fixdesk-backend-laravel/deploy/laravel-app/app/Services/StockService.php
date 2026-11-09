<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * พอร์ตจาก fixdesk-backend/src/services/stock-service.js
 */
class StockService
{
    /* ================== PRODUCTS ================== */

    public function getAllProducts(): array
    {
        return DB::table('products as pd')
            ->leftJoin('categories as ct', 'pd.pd_category_id', '=', 'ct.ct_id')
            ->leftJoin('units as un', 'pd.pd_unit_id', '=', 'un.units_id')
            ->orderBy('pd.pd_id')
            ->selectRaw('pd.pd_id, pd.pd_asset_code, pd.pd_name, ct.ct_name,
                pd.pd_quantity, un.units_name, pd.pd_updated_at, pd.pd_upload_image, pd_status')
            ->get()
            ->all();
    }

    public function getAllTransactions(): array
    {
        return DB::table('stock_transactions as stt')
            ->leftJoin('products as pd', 'stt.stt_product_id', '=', 'pd.pd_id')
            ->leftJoin('user as u', 'stt.stt_user_id', '=', 'u.us_id')
            ->orderByDesc('stt.stt_created_at')
            ->selectRaw("stt.stt_id, stt.stt_product_id, stt.stt_type, stt.stt_quantity,
                stt.stt_created_at, stt.stt_ref_sf_id, stt.stt_user_id,
                pd.pd_name, pd.pd_asset_code,
                CONCAT(u.us_first_name_th, ' ', u.us_last_name_th) as user_name")
            ->get()
            ->all();
    }

    public function getOrCreateUnitId(string $unitName): int
    {
        $unit = DB::table('units')->where('units_name', $unitName)->first();
        if ($unit) {
            return $unit->units_id;
        }

        return DB::table('units')->insertGetId(['units_name' => $unitName], 'units_id');
    }

    public function addProduct(array $data, ?string $filename, ?int $userId = null): int
    {
        $unitId = $this->getOrCreateUnitId($data['unitName']);

        $productId = DB::table('products')->insertGetId([
            'pd_asset_code' => $data['assetCode'] ?? null,
            'pd_name' => $data['name'],
            'pd_category_id' => $data['categoryId'],
            'pd_quantity' => $data['quantity'],
            'pd_unit_id' => $unitId,
            'pd_upload_image' => $filename,
            'pd_updated_at' => now(),
        ], 'pd_id');

        if ($data['quantity'] > 0) {
            DB::table('stock_transactions')->insert([
                'stt_product_id' => $productId,
                'stt_user_id' => $userId,
                'stt_type' => 'IN',
                'stt_quantity' => $data['quantity'],
                'stt_created_at' => now(),
            ]);
        }

        return $productId;
    }

    /**
     * @throws \RuntimeException PRODUCT_NOT_FOUND
     */
    public function updateProduct(int $id, array $data, ?string $newFilename, ?int $userId = null): int
    {
        $old = DB::table('products')->where('pd_id', $id)->select('pd_quantity')->first();
        if (! $old) {
            throw new \RuntimeException('PRODUCT_NOT_FOUND');
        }
        $oldQuantity = $old->pd_quantity;

        $unitId = $this->getOrCreateUnitId($data['unitName']);

        $update = [
            'pd_asset_code' => $data['assetCode'],
            'pd_name' => $data['name'],
            'pd_detail' => $data['detail'],
            'pd_category_id' => $data['categoryId'],
            'pd_quantity' => $data['quantity'],
            'pd_unit_id' => $unitId,
            'pd_status' => $data['status'],
            'pd_updated_at' => now(),
        ];
        if ($newFilename) {
            $update['pd_upload_image'] = $newFilename;
        }

        $affected = DB::table('products')->where('pd_id', $id)->update($update);

        $diff = $data['quantity'] - $oldQuantity;
        if ($diff > 0) {
            DB::table('stock_transactions')->insert([
                'stt_product_id' => $id, 'stt_user_id' => $userId, 'stt_type' => 'IN',
                'stt_quantity' => $diff, 'stt_created_at' => now(),
            ]);
        } elseif ($diff < 0) {
            DB::table('stock_transactions')->insert([
                'stt_product_id' => $id, 'stt_user_id' => $userId, 'stt_type' => 'OUT',
                'stt_quantity' => abs($diff), 'stt_created_at' => now(),
            ]);
        }

        return $affected;
    }

    /**
     * @throws \RuntimeException PRODUCT_NOT_FOUND
     */
    public function deleteProduct(int $id, ?int $userId = null): bool
    {
        $row = DB::table('products')->where('pd_id', $id)
            ->select('pd_upload_image', 'pd_quantity', 'pd_name')->first();
        if (! $row) {
            throw new \RuntimeException('PRODUCT_NOT_FOUND');
        }

        if ($row->pd_quantity > 0) {
            DB::table('stock_transactions')->insert([
                'stt_product_id' => $id, 'stt_user_id' => $userId, 'stt_type' => 'OUT',
                'stt_quantity' => $row->pd_quantity, 'stt_created_at' => now(),
            ]);
        }

        DB::table('products')->where('pd_id', $id)->delete();

        if ($row->pd_upload_image) {
            $path = public_path('uploads/'.$row->pd_upload_image);
            if (File::exists($path)) {
                File::delete($path);
            }
        }

        return true;
    }

    /* ================== CATEGORIES & UNITS ================== */

    public function getAllCategories(): array
    {
        return DB::table('categories')->orderBy('ct_name')->select('ct_id', 'ct_name')->get()->all();
    }

    /**
     * @throws \RuntimeException DUPLICATE_NAME
     */
    public function addCategory(string $name): int
    {
        if (DB::table('categories')->whereRaw('LOWER(ct_name) = LOWER(?)', [$name])->exists()) {
            throw new \RuntimeException('DUPLICATE_NAME');
        }

        return DB::table('categories')->insertGetId(['ct_name' => $name], 'ct_id');
    }

    /**
     * @throws \RuntimeException DUPLICATE_NAME|NOT_FOUND
     */
    public function updateCategory(int $id, string $name): bool
    {
        if (DB::table('categories')->whereRaw('LOWER(ct_name) = LOWER(?)', [$name])->where('ct_id', '<>', $id)->exists()) {
            throw new \RuntimeException('DUPLICATE_NAME');
        }

        $affected = DB::table('categories')->where('ct_id', $id)->update(['ct_name' => $name]);
        if ($affected === 0) {
            throw new \RuntimeException('NOT_FOUND');
        }

        return true;
    }

    /**
     * @throws \RuntimeException DEPENDENCY_EXISTS|NOT_FOUND
     */
    public function deleteCategory(int $id): bool
    {
        if (DB::table('products')->where('pd_category_id', $id)->exists()) {
            throw new \RuntimeException('DEPENDENCY_EXISTS');
        }

        $affected = DB::table('categories')->where('ct_id', $id)->delete();
        if ($affected === 0) {
            throw new \RuntimeException('NOT_FOUND');
        }

        return true;
    }

    public function getAllUnits(): array
    {
        return DB::table('units')->orderBy('units_name')->select('units_id', 'units_name')->get()->all();
    }

    /* ================== STOCK FORMS ================== */

    public function getStockForms(?int $userId = null): array
    {
        $query = DB::table('stock_form as sf')
            ->leftJoin('user as u', 'u.us_id', '=', 'sf.sf_us_id')
            ->leftJoin('repair_form as rf', 'sf.sf_rf_id', '=', 'rf.rf_id')
            ->leftJoin('room as r', 'rf.rf_room_id', '=', 'r.room_id')
            ->leftJoin('floor as f', 'r.room_fl_id', '=', 'f.fl_id')
            ->leftJoin('building as b', 'f.fl_bd_id', '=', 'b.bd_id')
            ->leftJoin('stock_form_detail as sfd', 'sfd.sfd_sf_id', '=', 'sf.sf_id')
            ->leftJoin('products as pd', 'pd.pd_id', '=', 'sfd.sfd_pd_id');

        if ($userId) {
            $query->where('sf.sf_us_id', $userId);
        }

        return $query->groupBy('sf.sf_id', 'sf.sf_code', 'sf.sf_status', 'sf.sf_create_at', 'rf.rf_code',
            'u.us_department', 'u.us_first_name_th', 'u.us_last_name_th', 'b.bd_name', 'f.fl_name', 'r.room_name')
            ->orderByDesc('sf.sf_id')
            ->selectRaw("sf.sf_id, sf.sf_code, sf.sf_status, sf.sf_create_at,
                rf.rf_code,
                u.us_department,
                CONCAT(u.us_first_name_th, ' ', u.us_last_name_th) as requester,
                b.bd_name, f.fl_name, r.room_name,
                GROUP_CONCAT(CONCAT(pd.pd_name, ' x', sfd.sfd_qty) ORDER BY sfd.sfd_id SEPARATOR '\n') as items")
            ->get()
            ->all();
    }

    public function getStockFormDetail(string $code): array
    {
        return DB::table('stock_form as sf')
            ->leftJoin('user as u', 'u.us_id', '=', 'sf.sf_us_id')
            ->leftJoin('repair_form as rf', 'rf.rf_id', '=', 'sf.sf_rf_id')
            ->leftJoin('room as r', 'rf.rf_room_id', '=', 'r.room_id')
            ->leftJoin('floor as f', 'r.room_fl_id', '=', 'f.fl_id')
            ->leftJoin('building as b', 'f.fl_bd_id', '=', 'b.bd_id')
            ->leftJoin('stock_form_detail as sfd', 'sfd.sfd_sf_id', '=', 'sf.sf_id')
            ->leftJoin('products as pd', 'pd.pd_id', '=', 'sfd.sfd_pd_id')
            ->leftJoin('categories as ct', 'ct.ct_id', '=', 'pd.pd_category_id')
            ->where('sf.sf_code', $code)
            ->selectRaw("sf.sf_id, sf.sf_code, sf.sf_status, sf.sf_create_at,
                u.us_department, CONCAT(u.us_first_name_th, ' ', u.us_last_name_th) as requester,
                b.bd_name, f.fl_name, r.room_name,
                pd.pd_id, pd.pd_name, pd.pd_asset_code, pd.pd_detail, pd.pd_upload_image,
                ct.ct_name as category, sfd.sfd_qty, sfd.sfd_status,
                rf.rf_code")
            ->get()
            ->all();
    }

    /**
     * @return array{itemStatus: string, formStatus: string}
     *
     * @throws \RuntimeException FORM_NOT_FOUND|ITEM_NOT_FOUND|ALREADY_PROCESSED
     */
    public function updateItemStatus(string $sfCode, int $pdId, string $status, ?int $userId = null): array
    {
        $sf = DB::table('stock_form')->where('sf_code', $sfCode)->select('sf_id')->first();
        if (! $sf) {
            throw new \RuntimeException('FORM_NOT_FOUND');
        }
        $sfId = $sf->sf_id;

        $item = DB::table('stock_form_detail')->where('sfd_sf_id', $sfId)->where('sfd_pd_id', $pdId)
            ->select('sfd_qty', 'sfd_status')->first();
        if (! $item) {
            throw new \RuntimeException('ITEM_NOT_FOUND');
        }
        if ($item->sfd_status !== 'waiting') {
            throw new \RuntimeException('ALREADY_PROCESSED');
        }

        DB::table('stock_form_detail')->where('sfd_sf_id', $sfId)->where('sfd_pd_id', $pdId)
            ->update(['sfd_status' => $status]);

        if ($status === 'approved') {
            DB::table('products')->where('pd_id', $pdId)->decrement('pd_quantity', $item->sfd_qty);
            DB::table('stock_transactions')->insert([
                'stt_product_id' => $pdId, 'stt_user_id' => $userId, 'stt_type' => 'OUT',
                'stt_quantity' => $item->sfd_qty, 'stt_created_at' => now(), 'stt_ref_sf_id' => $sfId,
            ]);
        }

        $newStatus = $this->recalculateFormStatus($sfId);

        return ['itemStatus' => $status, 'formStatus' => $newStatus];
    }

    /**
     * @param  array<int, array{pd_id: int, status: string}>  $items
     * @return array{formStatus: string}
     *
     * @throws \RuntimeException FORM_NOT_FOUND|INVALID_ITEM_DATA|ITEM_NOT_FOUND
     */
    public function updateMultipleItemsStatus(string $sfCode, array $items, ?int $userId = null): array
    {
        return DB::transaction(function () use ($sfCode, $items, $userId) {
            $sf = DB::table('stock_form')->where('sf_code', $sfCode)->select('sf_id')->first();
            if (! $sf) {
                throw new \RuntimeException('FORM_NOT_FOUND');
            }
            $sfId = $sf->sf_id;

            foreach ($items as $item) {
                $pdId = $item['pd_id'] ?? null;
                $status = $item['status'] ?? null;
                if (! $pdId || ! in_array($status, ['approved', 'rejected'], true)) {
                    throw new \RuntimeException('INVALID_ITEM_DATA');
                }

                $current = DB::table('stock_form_detail')->where('sfd_sf_id', $sfId)->where('sfd_pd_id', $pdId)
                    ->select('sfd_qty', 'sfd_status')->first();
                if (! $current) {
                    throw new \RuntimeException('ITEM_NOT_FOUND');
                }

                if ($current->sfd_status !== 'waiting') {
                    continue;
                }

                DB::table('stock_form_detail')->where('sfd_sf_id', $sfId)->where('sfd_pd_id', $pdId)
                    ->update(['sfd_status' => $status]);

                if ($status === 'approved') {
                    DB::table('products')->where('pd_id', $pdId)->decrement('pd_quantity', $current->sfd_qty);
                    DB::table('stock_transactions')->insert([
                        'stt_product_id' => $pdId, 'stt_user_id' => $userId, 'stt_type' => 'OUT',
                        'stt_quantity' => $current->sfd_qty, 'stt_created_at' => now(), 'stt_ref_sf_id' => $sfId,
                    ]);
                }
            }

            $newStatus = $this->recalculateFormStatus($sfId);

            return ['formStatus' => $newStatus];
        });
    }

    private function recalculateFormStatus(int $sfId): string
    {
        $stats = DB::table('stock_form_detail')->where('sfd_sf_id', $sfId)
            ->selectRaw("SUM(sfd_status = 'waiting') as waiting, SUM(sfd_status = 'approved') as approved, SUM(sfd_status = 'rejected') as rejected")
            ->first();

        $newStatus = 'waiting';
        if ((int) $stats->waiting === 0) {
            $newStatus = $stats->approved > 0 ? 'approved' : 'rejected';
        }

        DB::table('stock_form')->where('sf_id', $sfId)->update(['sf_status' => $newStatus]);

        return $newStatus;
    }

    public function updateFormStatus(string $sfCode, string $status): int
    {
        return DB::table('stock_form')->where('sf_code', $sfCode)->update(['sf_status' => $status]);
    }

    /* ================== IMPORT ================== */

    /**
     * @return array{success: int, failed: int, results: array, errors: array}
     */
    public function importStock(array $items, ?int $userId = null): array
    {
        $results = [];
        $errors = [];

        foreach ($items as $i => $item) {
            try {
                $qty = (float) ($item['pd_quantity'] ?? 0);
                if (empty($item['pd_name']) || $qty <= 0 || empty($item['pd_unit_name'])) {
                    throw new \RuntimeException('ข้อมูลไม่ครบถ้วน หรือจำนวนไม่ถูกต้อง');
                }

                $dupQuery = DB::table('products')->whereRaw('TRIM(LOWER(pd_name)) = TRIM(LOWER(?))', [$item['pd_name']]);
                if (! empty(trim($item['pd_asset_code'] ?? ''))) {
                    $assetCode = $item['pd_asset_code'];
                    $dupQuery->orWhere('pd_asset_code', $assetCode);
                }
                $dup = $dupQuery->select('pd_id')->first();

                if ($dup) {
                    DB::table('products')->where('pd_id', $dup->pd_id)->update([
                        'pd_quantity' => DB::raw("pd_quantity + {$qty}"),
                        'pd_updated_at' => now(),
                    ]);

                    $results[] = ['index' => $i, 'name' => $item['pd_name'], 'action' => 'updated_quantity'];

                    continue;
                }

                $unitId = $this->getOrCreateUnitId($item['pd_unit_name']);

                $categoryId = null;
                if (! empty($item['pd_category_name'])) {
                    $category = DB::table('categories')->where('ct_name', $item['pd_category_name'])->first();
                    if (! $category) {
                        throw new \RuntimeException('ไม่พบหมวดหมู่ที่ระบุ');
                    }
                    $categoryId = $category->ct_id;
                }

                $productId = DB::table('products')->insertGetId([
                    'pd_asset_code' => $item['pd_asset_code'] ?? null,
                    'pd_name' => $item['pd_name'],
                    'pd_category_id' => $categoryId,
                    'pd_quantity' => $qty,
                    'pd_unit_id' => $unitId,
                    'pd_updated_at' => now(),
                ], 'pd_id');

                DB::table('stock_transactions')->insert([
                    'stt_product_id' => $productId, 'stt_user_id' => $userId, 'stt_type' => 'IN',
                    'stt_quantity' => $qty, 'stt_created_at' => now(),
                ]);

                $results[] = ['index' => $i, 'name' => $item['pd_name']];
            } catch (\Throwable $e) {
                $errors[] = ['index' => $i, 'name' => $item['pd_name'] ?? null, 'message' => $e->getMessage()];
            }
        }

        return ['success' => count($results), 'failed' => count($errors), 'results' => $results, 'errors' => $errors];
    }

    /**
     * @throws \RuntimeException FORM_NOT_FOUND|NOTHING_TO_RETURN|RETURN_EXCEEDS_AVAILABLE
     */
    public function returnItem(string $sfCode, int $pdId, float $returnQty, int $userId): bool
    {
        return DB::transaction(function () use ($sfCode, $pdId, $returnQty, $userId) {
            $sf = DB::table('stock_form')->where('sf_code', $sfCode)->select('sf_id')->first();
            if (! $sf) {
                throw new \RuntimeException('FORM_NOT_FOUND');
            }
            $sfId = $sf->sf_id;

            $totalWithdraw = DB::table('stock_form_detail')
                ->where('sfd_sf_id', $sfId)->where('sfd_pd_id', $pdId)
                ->where('sfd_type', 'withdraw')->where('sfd_status', 'approved')
                ->sum('sfd_qty');

            $totalReturned = DB::table('stock_form_detail')
                ->where('sfd_sf_id', $sfId)->where('sfd_pd_id', $pdId)
                ->where('sfd_type', 'return')
                ->sum('sfd_qty');

            $remaining = $totalWithdraw - $totalReturned;

            if ($remaining <= 0) {
                throw new \RuntimeException('NOTHING_TO_RETURN');
            }
            if ($returnQty > $remaining) {
                throw new \RuntimeException('RETURN_EXCEEDS_AVAILABLE');
            }

            DB::table('stock_form_detail')->insert([
                'sfd_sf_id' => $sfId, 'sfd_pd_id' => $pdId, 'sfd_qty' => $returnQty,
                'sfd_type' => 'return', 'sfd_status' => 'returned',
            ]);

            DB::table('products')->where('pd_id', $pdId)->increment('pd_quantity', $returnQty);

            DB::table('stock_transactions')->insert([
                'stt_product_id' => $pdId, 'stt_user_id' => $userId, 'stt_type' => 'IN',
                'stt_quantity' => $returnQty, 'stt_created_at' => now(), 'stt_ref_sf_id' => $sfId,
            ]);

            return true;
        });
    }
}
