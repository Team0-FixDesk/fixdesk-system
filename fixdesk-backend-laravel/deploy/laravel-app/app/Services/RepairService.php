<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * พอร์ตจาก fixdesk-backend/src/services/repair-service.js
 */
class RepairService
{
    public function __construct(private LineNotificationService $lineNotification) {}

    public function generateRfCode(): string
    {
        $datePart = now()->format('Ymd');
        $count = DB::table('repair_form')
            ->whereRaw('DATE(rf_create_at) = CURDATE()')
            ->count();
        $running = str_pad((string) ($count + 1), 3, '0', STR_PAD_LEFT);

        return "RF{$datePart}{$running}";
    }

    public function createRepair(array $data): array
    {
        $rfCode = $this->generateRfCode();
        $imageData = ! empty($data['filePaths']) ? json_encode($data['filePaths']) : null;

        $location = DB::table('room as r')
            ->leftJoin('floor as f', 'r.room_fl_id', '=', 'f.fl_id')
            ->leftJoin('building as b', 'f.fl_bd_id', '=', 'b.bd_id')
            ->where('r.room_id', $data['roomId'])
            ->select('b.bd_name as building_name', 'f.fl_name as floor_name', 'r.room_name as room_name')
            ->first();

        $insertId = DB::table('repair_form')->insertGetId([
            'rf_code' => $rfCode,
            'rf_us_id' => $data['usId'],
            'rf_tt_id' => $data['repairTypeId'],
            'rf_room_id' => $data['roomId'],
            'rf_prop_number' => $data['assetCode'] ?? null,
            'rf_problem' => $data['problemDetail'],
            'rf_detail' => $data['issueDescription'] ?? null,
            'rf_phone' => $data['phoneNumber'] ?? null,
            'rf_urgency' => $data['urgency'] ?? 'medium',
            'rf_image' => $imageData,
            'rf_building_snapshot' => $location->building_name ?? null,
            'rf_floor_snapshot' => $location->floor_name ?? null,
            'rf_room_snapshot' => $location->room_name ?? null,
            'rf_user_status' => 'pending',
            'rf_create_at' => now(),
        ], 'rf_id');

        $result = ['insertId' => $insertId, 'rfCode' => $rfCode];

        $skip = $data['skip_line_notification'] ?? false;
        if ($skip === 'true' || $skip === true) {
            return $result;
        }

        $notifRow = DB::table('repair_form as rf')
            ->leftJoin('user as u', 'rf.rf_us_id', '=', 'u.us_id')
            ->leftJoin('technician_type as tt', 'rf.rf_tt_id', '=', 'tt.tt_id')
            ->where('rf.rf_id', $insertId)
            ->selectRaw("rf.rf_code, CONCAT(u.us_first_name_th, ' ', u.us_last_name_th) as user_name, rf.rf_problem,
                CONCAT(rf.rf_building_snapshot, ' ', rf.rf_floor_snapshot, ' ', rf.rf_room_snapshot) as location,
                tt.tt_name as repair_type, rf.rf_urgency, rf.rf_phone")
            ->first();

        if ($notifRow) {
            $notifResult = $this->lineNotification->notifyNewRepair([
                'rf_code' => $notifRow->rf_code,
                'user_name' => $notifRow->user_name,
                'repair_title' => $notifRow->rf_problem,
                'location' => $notifRow->location,
                'repair_type' => $notifRow->repair_type,
                'urgency' => $notifRow->rf_urgency ?? 'medium',
                'phone' => $notifRow->rf_phone,
            ]);

            if (! $notifResult['success'] && ($notifResult['errorType'] ?? null) === 'RATE_LIMIT_EXCEEDED') {
                $result['lineNotificationError'] = [
                    'errorType' => 'RATE_LIMIT_EXCEEDED',
                    'message' => 'เครดิต LINE Notify หมด ใบแจ้งซ่อมสร้างสำเร็จแล้ว แต่ไม่ได้ส่งแจ้งเตือนไป',
                ];
            }
        }

        return $result;
    }

    public function getAdminRepairs(): array
    {
        return DB::table('repair_form as rf')
            ->leftJoin('user as u', 'rf.rf_us_id', '=', 'u.us_id')
            ->leftJoin('technician_type as tt', 'rf.rf_tt_id', '=', 'tt.tt_id')
            ->leftJoin('repair_assignment as ra', function ($join) {
                $join->on('rf.rf_id', '=', 'ra.ra_rf_id')->where('ra.ra_is_lead', 1);
            })
            ->leftJoin('user as tech', 'ra.ra_us_id', '=', 'tech.us_id')
            ->orderByDesc('rf.rf_create_at')
            ->selectRaw("rf.rf_id, rf.rf_code, rf.rf_problem, rf.rf_create_at, rf.rf_update_at, rf.rf_in_process_at, rf.rf_done_at, rf.rf_user_status, rf.rf_repair_method, rf.rf_repair_method_remark,
                rf.rf_building_snapshot as bd_name, rf.rf_floor_snapshot as fl_name, rf.rf_room_snapshot as room_name,
                COALESCE(rf.rf_urgency, 'medium') as rf_urgency,
                u.us_first_name_th as us_first_name, u.us_last_name_th as us_last_name, u.us_department as department_name,
                tt.tt_name, tech.us_first_name_th as tech_first_name, tech.us_last_name_th as tech_last_name,
                ra.ra_us_id as rf_assigned_tech_id")
            ->get()
            ->all();
    }

    public function getUserRepairs(int $userId): array
    {
        return DB::table('repair_form as rf')
            ->leftJoin('technician_type as tt', 'rf.rf_tt_id', '=', 'tt.tt_id')
            ->leftJoin('user as u', 'rf.rf_us_id', '=', 'u.us_id')
            ->where('rf.rf_us_id', $userId)
            ->orderByDesc('rf.rf_create_at')
            ->selectRaw('rf.rf_id, rf.rf_code, rf.rf_prop_number, rf.rf_problem,
                rf.rf_urgency, rf.rf_user_status, rf.rf_create_at,
                rf.rf_building_snapshot as bd_name, rf.rf_floor_snapshot as fl_name, rf.rf_room_snapshot as room_name,
                u.us_department as department_name, tt.tt_name as tt_name')
            ->get()
            ->all();
    }

    public function getRepairDetail(string $code): ?array
    {
        $r = DB::table('repair_form as rf')
            ->leftJoin('room as r', 'rf.rf_room_id', '=', 'r.room_id')
            ->leftJoin('floor as f', 'r.room_fl_id', '=', 'f.fl_id')
            ->leftJoin('building as b', 'f.fl_bd_id', '=', 'b.bd_id')
            ->leftJoin('technician_type as t', 'rf.rf_tt_id', '=', 't.tt_id')
            ->leftJoin('user as u', 'rf.rf_us_id', '=', 'u.us_id')
            ->leftJoin('title_name as tn', 'u.us_ttn_id', '=', 'tn.ttn_id')
            ->leftJoin('repair_assignment as ra', function ($join) {
                $join->on('rf.rf_id', '=', 'ra.ra_rf_id')->where('ra.ra_is_lead', 1);
            })
            ->leftJoin('user as tech', 'ra.ra_us_id', '=', 'tech.us_id')
            ->leftJoin('title_name as tn_tech', 'tech.us_ttn_id', '=', 'tn_tech.ttn_id')
            ->leftJoin('technician_type as tt_tech', 'tech.us_tt_id', '=', 'tt_tech.tt_id')
            ->leftJoin('user as assigner', 'ra.ra_assigned_by', '=', 'assigner.us_id')
            ->leftJoin('title_name as tn_assigner', 'assigner.us_ttn_id', '=', 'tn_assigner.ttn_id')
            ->where('rf.rf_code', $code)
            ->selectRaw("rf.rf_id, rf.rf_code, rf.rf_problem, rf.rf_detail, rf.rf_urgency,
                rf.rf_phone, rf.rf_create_at, rf.rf_in_process_at, rf.rf_done_at,
                rf.rf_user_status, rf.rf_prop_number, rf.rf_image, rf.rf_tech_summary,
                rf.rf_tech_image_after,
                rf.rf_repair_method, rf.rf_repair_method_remark, rf.rf_result_status, rf.rf_result_remark,
                t.tt_id as repair_type_id, t.tt_name as repair_type_name,
                r.room_id as room_id, f.fl_id as floor_id, b.bd_id as building_id,
                rf.rf_building_snapshot as building_name, rf.rf_floor_snapshot as floor_name, rf.rf_room_snapshot as room_name,
                CONCAT(tn.ttn_title_th, u.us_first_name_th, ' ', u.us_last_name_th) as reporter_name,
                u.us_phone as reporter_phone, u.us_department as reporter_department,
                tech.us_id as main_technician_id,
                CONCAT(tn_tech.ttn_title_th, tech.us_first_name_th, ' ', tech.us_last_name_th) as main_technician_name,
                tt_tech.tt_name as main_technician_position,
                assigner.us_id as assigner_id,
                CONCAT(tn_assigner.ttn_title_th, assigner.us_first_name_th, ' ', assigner.us_last_name_th) as assigner_name,
                tn_assigner.ttn_title_th as assigner_title,
                assigner.us_first_name_th as assigner_first_name,
                assigner.us_last_name_th as assigner_last_name")
            ->first();

        if (! $r) {
            return null;
        }

        $result = (array) $r;
        $result['rf_image'] = $r->rf_image ? json_decode($r->rf_image, true) : null;
        $result['reporter'] = [
            'name' => $r->reporter_name,
            'phone' => $r->reporter_phone,
            'department' => $r->reporter_department,
        ];
        $result['assigner'] = [
            'id' => $r->assigner_id,
            'name' => $r->assigner_name ?: '-',
            'title' => $r->assigner_title ?: '',
            'first_name' => $r->assigner_first_name ?: '',
            'last_name' => $r->assigner_last_name ?: '',
        ];
        $result['main_technician'] = $r->main_technician_name ?: '-';
        $result['tech_position'] = $r->main_technician_position ?: '-';

        $stockRows = DB::table('stock_form as sf')
            ->leftJoin('stock_form_detail as sfd', 'sfd.sfd_sf_id', '=', 'sf.sf_id')
            ->leftJoin('products as pd', 'pd.pd_id', '=', 'sfd.sfd_pd_id')
            ->where('sf.sf_rf_id', $r->rf_id)
            ->selectRaw("pd.pd_id, pd.pd_name, sf.sf_code, pd.pd_asset_code, pd.pd_upload_image,
                CASE
                    WHEN sfd.sfd_type = 'withdraw' THEN (sfd.sfd_qty - COALESCE((
                        SELECT SUM(r2.sfd_qty) FROM stock_form_detail r2
                        WHERE r2.sfd_sf_id = sfd.sfd_sf_id AND r2.sfd_pd_id = sfd.sfd_pd_id AND r2.sfd_type = 'return'
                    ), 0))
                    WHEN sfd.sfd_type = 'return' THEN sfd.sfd_qty
                    ELSE sfd.sfd_qty
                END as sfd_qty,
                CASE WHEN sfd.sfd_type = 'return' THEN 'returned' ELSE sfd.sfd_status END as sfd_status")
            ->get();

        $result['stock_items'] = $stockRows->map(fn ($i) => [
            'id' => $i->pd_id,
            'sf_code' => $i->sf_code,
            'name' => $i->pd_name,
            'assetCode' => $i->pd_asset_code,
            'qty' => $i->sfd_qty,
            'status' => $i->sfd_status,
            'img' => $i->pd_upload_image,
        ])->all();

        return $result;
    }

    public function updateRepair(string $code, array $data): int
    {
        $imageData = ! empty($data['filePaths']) ? json_encode($data['filePaths']) : null;

        return DB::table('repair_form')
            ->where('rf_code', $code)
            ->where('rf_user_status', 'pending')
            ->update([
                'rf_us_id' => $data['usId'] ?? null,
                'rf_tt_id' => $data['repairTypeId'],
                'rf_room_id' => $data['roomId'],
                'rf_prop_number' => $data['assetCode'] ?? null,
                'rf_problem' => $data['problemDetail'],
                'rf_detail' => $data['issueDescription'] ?? '-',
                'rf_phone' => $data['phoneNumber'] ?? null,
                'rf_urgency' => $data['urgency'] ?? 'medium',
                'rf_image' => $imageData,
                'rf_update_at' => now(),
            ]);
    }

    public function deleteRepair(string $code): int
    {
        return DB::table('repair_form')
            ->where('rf_code', $code)
            ->where('rf_user_status', 'pending')
            ->delete();
    }

    /**
     * @return array{status: string}
     *
     * @throws \RuntimeException TECH_NOT_FOUND|NOT_A_TECHNICIAN|REPAIR_NOT_FOUND|LINE_RATE_LIMIT
     */
    public function assignIndividual(string $rfCode, int $techId, bool $isLead, ?int $assignerId): array
    {
        $tech = DB::table('user')->where('us_id', $techId)->select('us_id', 'us_role_id')->first();
        if (! $tech) {
            throw new \RuntimeException('TECH_NOT_FOUND');
        }
        if ((int) $tech->us_role_id !== 2) {
            throw new \RuntimeException('NOT_A_TECHNICIAN');
        }

        $rf = DB::table('repair_form')->where('rf_code', $rfCode)->select('rf_id')->first();
        if (! $rf) {
            throw new \RuntimeException('REPAIR_NOT_FOUND');
        }
        $rfId = $rf->rf_id;

        $existing = DB::table('repair_assignment')
            ->where('ra_rf_id', $rfId)->where('ra_us_id', $techId)->first();

        if ($existing) {
            if ($isLead) {
                DB::table('repair_assignment')->where('ra_rf_id', $rfId)->update(['ra_is_lead' => 0]);
                DB::table('repair_assignment')->where('ra_rf_id', $rfId)->where('ra_us_id', $techId)->update(['ra_is_lead' => 1]);

                return ['status' => 'UPDATED_TO_LEAD'];
            }

            return ['status' => 'ALREADY_ASSIGNED'];
        }

        DB::table('repair_assignment')->insert([
            'ra_rf_id' => $rfId,
            'ra_us_id' => $techId,
            'ra_is_lead' => $isLead ? 1 : 0,
            'ra_assigned_at' => now(),
            'ra_assigned_by' => $assignerId,
        ]);

        if ($isLead) {
            DB::table('repair_assignment')->where('ra_rf_id', $rfId)->where('ra_us_id', '<>', $techId)->update(['ra_is_lead' => 0]);
        }

        $notifRow = DB::table('repair_form as rf')
            ->leftJoin('user as tech', fn ($join) => $join->whereRaw('tech.us_id = ?', [$techId]))
            ->leftJoin('title_name as tn_tech', 'tech.us_ttn_id', '=', 'tn_tech.ttn_id')
            ->leftJoin('user as assigner', fn ($join) => $join->whereRaw('assigner.us_id = ?', [$assignerId ?? 0]))
            ->leftJoin('title_name as tn_assign', 'assigner.us_ttn_id', '=', 'tn_assign.ttn_id')
            ->leftJoin('technician_type as tt', 'rf.rf_tt_id', '=', 'tt.tt_id')
            ->where('rf.rf_id', $rfId)
            ->selectRaw("rf.rf_code, rf.rf_problem, rf.rf_urgency,
                CONCAT(tn_tech.ttn_title_th, tech.us_first_name_th, ' ', tech.us_last_name_th) as technician_name,
                CONCAT(tn_assign.ttn_title_th, assigner.us_first_name_th, ' ', assigner.us_last_name_th) as assigned_by_name,
                CONCAT(rf.rf_building_snapshot, ' ', rf.rf_floor_snapshot, ' ', rf.rf_room_snapshot) as location,
                tt.tt_name as technician_type")
            ->first();

        if ($notifRow) {
            $notifResult = $this->lineNotification->notifyJobAssignment([
                'rf_code' => $notifRow->rf_code,
                'technician_name' => $notifRow->technician_name,
                'assigned_by_name' => $notifRow->assigned_by_name,
                'repair_title' => $notifRow->rf_problem,
                'location' => $notifRow->location,
                'technician_type' => $notifRow->technician_type,
                'urgency' => $notifRow->rf_urgency,
                'is_team' => false,
            ]);
            if (! $notifResult['success'] && ($notifResult['errorType'] ?? null) === 'RATE_LIMIT_EXCEEDED') {
                throw new \RuntimeException('LINE_RATE_LIMIT');
            }
        }

        return ['status' => 'SUCCESS'];
    }

    /**
     * @param  int[]  $techIds
     * @return array{assignedCount: int}
     *
     * @throws \RuntimeException REPAIR_NOT_FOUND|SOME_TECHS_NOT_FOUND|SOME_USERS_ARE_NOT_TECHS|LINE_RATE_LIMIT
     */
    public function assignTeam(string $rfCode, array $techIds, int $leadId): array
    {
        $rfId = DB::transaction(function () use ($rfCode, $techIds, $leadId) {
            $rf = DB::table('repair_form')->where('rf_code', $rfCode)->lockForUpdate()->select('rf_id')->first();
            if (! $rf) {
                throw new \RuntimeException('REPAIR_NOT_FOUND');
            }
            $rfId = $rf->rf_id;

            $techs = DB::table('user')->whereIn('us_id', $techIds)->select('us_id', 'us_role_id')->get();
            if ($techs->count() !== count($techIds)) {
                throw new \RuntimeException('SOME_TECHS_NOT_FOUND');
            }
            if ($techs->contains(fn ($t) => (int) $t->us_role_id !== 2)) {
                throw new \RuntimeException('SOME_USERS_ARE_NOT_TECHS');
            }

            DB::table('repair_assignment')->where('ra_rf_id', $rfId)->delete();

            $now = now();
            DB::table('repair_assignment')->insert(array_map(fn ($tid) => [
                'ra_rf_id' => $rfId,
                'ra_us_id' => $tid,
                'ra_is_lead' => $tid === $leadId ? 1 : 0,
                'ra_assigned_at' => $now,
            ], $techIds));

            return $rfId;
        });

        $notifRow = DB::table('repair_form as rf')
            ->leftJoin('repair_assignment as ra', 'rf.rf_id', '=', 'ra.ra_rf_id')
            ->leftJoin('user as u', 'ra.ra_us_id', '=', 'u.us_id')
            ->leftJoin('title_name as tn', 'u.us_ttn_id', '=', 'tn.ttn_id')
            ->leftJoin('technician_type as tt', 'rf.rf_tt_id', '=', 'tt.tt_id')
            ->where('rf.rf_id', $rfId)
            ->groupBy('rf.rf_id', 'rf.rf_code', 'rf.rf_problem', 'rf.rf_urgency', 'rf.rf_building_snapshot', 'rf.rf_floor_snapshot', 'rf.rf_room_snapshot', 'tt.tt_name')
            ->selectRaw("rf.rf_code, rf.rf_problem, rf.rf_urgency,
                GROUP_CONCAT(CONCAT(tn.ttn_title_th, u.us_first_name_th, ' ', u.us_last_name_th) SEPARATOR ', ') as technician_names,
                CONCAT(rf.rf_building_snapshot, ' ', rf.rf_floor_snapshot, ' ', rf.rf_room_snapshot) as location,
                tt.tt_name as technician_type")
            ->first();

        $leadRow = DB::table('repair_assignment as ra')
            ->leftJoin('user as u', 'ra.ra_us_id', '=', 'u.us_id')
            ->leftJoin('title_name as tn', 'u.us_ttn_id', '=', 'tn.ttn_id')
            ->where('ra.ra_rf_id', $rfId)->where('ra.ra_is_lead', 1)
            ->selectRaw("CONCAT(tn.ttn_title_th, u.us_first_name_th, ' ', u.us_last_name_th) as lead_name")
            ->first();

        if ($notifRow) {
            $notifResult = $this->lineNotification->notifyJobAssignment([
                'rf_code' => $notifRow->rf_code,
                'technician_name' => $notifRow->technician_names,
                'assigned_by_name' => '-',
                'repair_title' => $notifRow->rf_problem,
                'location' => $notifRow->location,
                'technician_type' => $notifRow->technician_type,
                'urgency' => $notifRow->rf_urgency,
                'lead_name' => $leadRow->lead_name ?? null,
                'is_team' => true,
            ]);
            if (! $notifResult['success'] && ($notifResult['errorType'] ?? null) === 'RATE_LIMIT_EXCEEDED') {
                throw new \RuntimeException('LINE_RATE_LIMIT');
            }
        }

        return ['assignedCount' => count($techIds)];
    }

    /**
     * @throws \RuntimeException LINE_RATE_LIMIT
     */
    public function acceptJob(string $rfCode, int $techId): int
    {
        $affected = DB::update(
            "UPDATE repair_form rf
             JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id
             SET rf.rf_user_status = 'in_progress', rf.rf_in_process_at = NOW(), rf.rf_update_at = NOW(),
                 ra.ra_is_lead = 1, ra.ra_accepted_at = NOW()
             WHERE rf.rf_code = ? AND ra.ra_us_id = ? AND rf.rf_user_status = 'pending'",
            [$rfCode, $techId]
        );

        if ($affected > 0) {
            $notifRow = DB::table('repair_form as rf')
                ->leftJoin('repair_assignment as ra', function ($join) use ($techId) {
                    $join->on('rf.rf_id', '=', 'ra.ra_rf_id')->where('ra.ra_us_id', $techId);
                })
                ->leftJoin('user as u', 'ra.ra_us_id', '=', 'u.us_id')
                ->leftJoin('title_name as tn', 'u.us_ttn_id', '=', 'tn.ttn_id')
                ->leftJoin('technician_type as tt', 'rf.rf_tt_id', '=', 'tt.tt_id')
                ->where('rf.rf_code', $rfCode)
                ->selectRaw("rf.rf_code, rf.rf_problem, rf.rf_urgency,
                    CONCAT(tn.ttn_title_th, u.us_first_name_th, ' ', u.us_last_name_th) as technician_name,
                    CONCAT(rf.rf_building_snapshot, ' ', rf.rf_floor_snapshot, ' ', rf.rf_room_snapshot) as location,
                    tt.tt_name as technician_type")
                ->first();

            if ($notifRow) {
                $notifResult = $this->lineNotification->notifyJobAccepted([
                    'rf_code' => $notifRow->rf_code,
                    'technician_name' => $notifRow->technician_name,
                    'repair_title' => $notifRow->rf_problem,
                    'location' => $notifRow->location,
                    'technician_type' => $notifRow->technician_type,
                    'urgency' => $notifRow->rf_urgency,
                ]);
                if (! $notifResult['success'] && ($notifResult['errorType'] ?? null) === 'RATE_LIMIT_EXCEEDED') {
                    throw new \RuntimeException('LINE_RATE_LIMIT');
                }
            }
        }

        return $affected;
    }

    public function getStats(int $userId): array
    {
        $row = DB::table('repair_form')
            ->where('rf_us_id', $userId)
            ->selectRaw("COUNT(*) as total,
                COALESCE(SUM(CASE WHEN rf_user_status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
                COALESCE(SUM(CASE WHEN rf_user_status = 'in_progress' THEN 1 ELSE 0 END), 0) as in_progress,
                COALESCE(SUM(CASE WHEN rf_user_status = 'done' THEN 1 ELSE 0 END), 0) as completed")
            ->first();

        return (array) $row;
    }
}
