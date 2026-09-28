<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * พอร์ตจาก fixdesk-backend/src/services/technician-service.js
 */
class TechnicianService
{
    public function getAllTechnicians(): array
    {
        return DB::table('user as u')
            ->leftJoin('technician_type as tt', 'u.us_tt_id', '=', 'tt.tt_id')
            ->leftJoin('title_name as tn', 'u.us_ttn_id', '=', 'tn.ttn_id')
            ->where('u.us_role_id', 2)
            ->orderBy('u.us_first_name_th')
            ->selectRaw("u.us_id, u.us_user_name,
                tn.ttn_title_th as prefix_name,
                u.us_first_name_th as us_first_name, u.us_last_name_th as us_last_name,
                u.us_phone, u.us_department, u.us_tt_id,
                tt.tt_name")
            ->get()
            ->all();
    }

    public function getAllTechnicianTypes(): array
    {
        return DB::table('technician_type')->orderBy('tt_name')->select('tt_id', 'tt_name')->get()->all();
    }

    /**
     * @throws \RuntimeException DUPLICATE_NAME
     */
    public function createTechnicianType(string $name): int
    {
        if (DB::table('technician_type')->whereRaw('LOWER(tt_name) = LOWER(?)', [$name])->exists()) {
            throw new \RuntimeException('DUPLICATE_NAME');
        }

        return DB::table('technician_type')->insertGetId(['tt_name' => $name], 'tt_id');
    }

    /**
     * @throws \RuntimeException DEPENDENCY_EXISTS|DUPLICATE_NAME|NOT_FOUND
     */
    public function updateTechnicianType(int $id, string $name): bool
    {
        if (DB::table('repair_form')->where('rf_tt_id', $id)->exists()) {
            throw new \RuntimeException('DEPENDENCY_EXISTS');
        }

        if (DB::table('technician_type')->whereRaw('LOWER(tt_name) = LOWER(?)', [$name])->where('tt_id', '<>', $id)->exists()) {
            throw new \RuntimeException('DUPLICATE_NAME');
        }

        $affected = DB::table('technician_type')->where('tt_id', $id)->update(['tt_name' => $name]);
        if ($affected === 0) {
            throw new \RuntimeException('NOT_FOUND');
        }

        return true;
    }

    /**
     * @throws \RuntimeException DEPENDENCY_EXISTS|NOT_FOUND
     */
    public function deleteTechnicianType(int $id): bool
    {
        if (DB::table('user')->where('us_tt_id', $id)->exists()) {
            throw new \RuntimeException('DEPENDENCY_EXISTS');
        }
        if (DB::table('repair_form')->where('rf_tt_id', $id)->exists()) {
            throw new \RuntimeException('DEPENDENCY_EXISTS');
        }

        $affected = DB::table('technician_type')->where('tt_id', $id)->delete();
        if ($affected === 0) {
            throw new \RuntimeException('NOT_FOUND');
        }

        return true;
    }

    private function repairsBaseQuery(int $techId)
    {
        return DB::table('repair_form as rf')
            ->join('repair_assignment as ra', 'rf.rf_id', '=', 'ra.ra_rf_id')
            ->leftJoin('user as u', 'rf.rf_us_id', '=', 'u.us_id')
            ->leftJoin('technician_type as tt', 'rf.rf_tt_id', '=', 'tt.tt_id')
            ->leftJoin('room as r', 'rf.rf_room_id', '=', 'r.room_id')
            ->leftJoin('floor as f', 'r.room_fl_id', '=', 'f.fl_id')
            ->leftJoin('building as b', 'f.fl_bd_id', '=', 'b.bd_id')
            ->where('ra.ra_us_id', $techId)
            ->orderByDesc('rf.rf_create_at')
            ->selectRaw("rf.rf_id, rf.rf_code, rf.rf_prop_number, rf.rf_problem,
                rf.rf_create_at, rf.rf_user_status,
                COALESCE(rf.rf_urgency, 'medium') as rf_urgency,
                u.us_first_name_th as us_first_name, u.us_last_name_th as us_last_name,
                u.us_department as department_name,
                tt.tt_name,
                b.bd_name as building_name, f.fl_name as floor_name, r.room_name as room_name");
    }

    public function getTechnicianRepairs(int $techId): array
    {
        return $this->repairsBaseQuery($techId)->get()->all();
    }

    public function getTechnicianHistory(int $techId): array
    {
        return $this->repairsBaseQuery($techId)->where('rf.rf_user_status', 'done')->get()->all();
    }

    public function getMyStockForms(int $techId): array
    {
        return DB::table('stock_form as sf')
            ->leftJoin('repair_form as rf', 'sf.sf_rf_id', '=', 'rf.rf_id')
            ->leftJoin('room as r', 'rf.rf_room_id', '=', 'r.room_id')
            ->leftJoin('floor as f', 'r.room_fl_id', '=', 'f.fl_id')
            ->leftJoin('building as b', 'f.fl_bd_id', '=', 'b.bd_id')
            ->where('sf.sf_us_id', $techId)
            ->orderByDesc('sf.sf_create_at')
            ->selectRaw('sf.sf_id, sf.sf_code, sf.sf_create_at, sf.sf_update_at,
                sf.sf_status, sf.sf_rf_id, rf.rf_code as related_rf_code,
                b.bd_name as building_name, f.fl_name as floor_name, r.room_name as room_name')
            ->get()
            ->all();
    }

    /**
     * ปิดงาน / ส่ง Outsource / อื่นๆ
     *
     * @throws \RuntimeException PENDING_STOCK_APPROVAL|INVALID_STATUS|JOB_NOT_FOUND_OR_INVALID_STATUS
     */
    public function closeJob(
        int $techId,
        string $rfCode,
        string $status,
        ?string $summary,
        ?string $imageAfter,
        ?string $repairMethod,
        ?string $repairMethodRemark,
        ?string $resultStatus,
        ?string $resultRemark,
    ): bool {
        $pendingStock = DB::table('stock_form as sf')
            ->join('stock_form_detail as sfd', 'sfd.sfd_sf_id', '=', 'sf.sf_id')
            ->join('repair_form as rf', 'rf.rf_id', '=', 'sf.sf_rf_id')
            ->where('rf.rf_code', $rfCode)
            ->where('sfd.sfd_status', 'waiting')
            ->exists();

        if ($pendingStock) {
            throw new \RuntimeException('PENDING_STOCK_APPROVAL');
        }

        $update = match ($status) {
            'done' => [
                'rf_user_status' => 'done',
                'rf_done_at' => now(),
                'rf_tech_summary' => $summary,
                'rf_tech_image_after' => $imageAfter,
                'rf_repair_method' => $repairMethod ?: 'in_house',
                'rf_repair_method_remark' => $repairMethodRemark,
                'rf_result_status' => $resultStatus ?: 'completed',
                'rf_result_remark' => $resultRemark,
            ],
            'outsource' => [
                'rf_user_status' => 'outsource',
                'rf_repair_method' => 'outsource',
                'rf_repair_method_remark' => $repairMethodRemark,
            ],
            'other' => [
                'rf_user_status' => 'done',
                'rf_done_at' => now(),
                'rf_tech_summary' => $summary,
                'rf_tech_image_after' => $imageAfter,
                'rf_repair_method' => 'other',
                'rf_repair_method_remark' => $repairMethodRemark,
                'rf_result_status' => $resultStatus ?: 'completed',
                'rf_result_remark' => $resultRemark,
            ],
            default => throw new \RuntimeException('INVALID_STATUS'),
        };

        $affected = DB::update(
            'UPDATE repair_form rf
             JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id
             SET '.implode(', ', array_map(fn ($col) => "rf.{$col} = ?", array_keys($update))).'
             WHERE rf.rf_code = ? AND ra.ra_us_id = ? AND rf.rf_user_status IN (?, ?)',
            [...array_values($update), $rfCode, $techId, 'in_progress', 'outsource']
        );

        if ($affected === 0) {
            throw new \RuntimeException('JOB_NOT_FOUND_OR_INVALID_STATUS');
        }

        return true;
    }

    /**
     * @param  array<int, array{id: int, qty: int|float}>  $items
     * @return array{sfId: int, sfCode: string}
     *
     * @throws \RuntimeException PRODUCT_NOT_FOUND:{id}|INSUFFICIENT_STOCK:{name}
     */
    public function withdrawStock(int $techId, ?string $repairCode, array $items): array
    {
        return DB::transaction(function () use ($techId, $repairCode, $items) {
            $rfId = null;
            if ($repairCode) {
                $rf = DB::table('repair_form')->where('rf_code', $repairCode)->select('rf_id')->first();
                if ($rf) {
                    $rfId = $rf->rf_id;
                }
            }

            $datePart = now()->format('Ymd');
            $count = DB::table('stock_form')->whereRaw('DATE(sf_create_at) = CURDATE()')->count();
            $sfCode = 'SF'.$datePart.str_pad((string) ($count + 1), 3, '0', STR_PAD_LEFT);

            $sfId = DB::table('stock_form')->insertGetId([
                'sf_code' => $sfCode,
                'sf_status' => 'waiting',
                'sf_create_at' => now(),
                'sf_us_id' => $techId,
                'sf_rf_id' => $rfId,
            ], 'sf_id');

            foreach ($items as $item) {
                $product = DB::table('products')->where('pd_id', $item['id'])->select('pd_quantity', 'pd_name')->first();
                if (! $product) {
                    throw new \RuntimeException("PRODUCT_NOT_FOUND:{$item['id']}");
                }
                if ($product->pd_quantity < $item['qty']) {
                    throw new \RuntimeException("INSUFFICIENT_STOCK:{$product->pd_name}");
                }

                DB::table('stock_form_detail')->insert([
                    'sfd_sf_id' => $sfId,
                    'sfd_pd_id' => $item['id'],
                    'sfd_qty' => $item['qty'],
                    'sfd_status' => 'waiting',
                ]);
            }

            return ['sfId' => $sfId, 'sfCode' => $sfCode];
        });
    }
}
