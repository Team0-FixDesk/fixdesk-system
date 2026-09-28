<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * พอร์ตจาก fixdesk-backend/src/services/location-service.js
 */
class LocationService
{
    public function getAllBuildings(): array
    {
        return DB::table('building')->orderBy('bd_id')->selectRaw('bd_id as building_id, bd_name as building_name')->get()->all();
    }

    /**
     * @throws \RuntimeException DUPLICATE_NAME
     */
    public function createBuilding(string $name): int
    {
        if (DB::table('building')->whereRaw('LOWER(bd_name) = LOWER(?)', [$name])->exists()) {
            throw new \RuntimeException('DUPLICATE_NAME');
        }

        return DB::table('building')->insertGetId(['bd_name' => $name], 'bd_id');
    }

    /**
     * @throws \RuntimeException DUPLICATE_NAME|NOT_FOUND
     */
    public function updateBuilding(int $id, string $name): bool
    {
        if (DB::table('building')->whereRaw('LOWER(bd_name) = LOWER(?)', [$name])->where('bd_id', '<>', $id)->exists()) {
            throw new \RuntimeException('DUPLICATE_NAME');
        }

        $affected = DB::table('building')->where('bd_id', $id)->update(['bd_name' => $name]);
        if ($affected === 0) {
            throw new \RuntimeException('NOT_FOUND');
        }

        return true;
    }

    /**
     * @throws \RuntimeException DEPENDENCY_EXISTS|NOT_FOUND
     */
    public function deleteBuilding(int $id): bool
    {
        if (DB::table('floor')->where('fl_bd_id', $id)->exists()) {
            throw new \RuntimeException('DEPENDENCY_EXISTS');
        }

        $affected = DB::table('building')->where('bd_id', $id)->delete();
        if ($affected === 0) {
            throw new \RuntimeException('NOT_FOUND');
        }

        return true;
    }

    public function getFloorsByBuilding(int $buildingId): array
    {
        return DB::table('floor')->where('fl_bd_id', $buildingId)->orderBy('fl_id')
            ->selectRaw('fl_id as floor_id, fl_name as floor_name')->get()->all();
    }

    public function getAllFloors(): array
    {
        return DB::table('floor as f')
            ->leftJoin('building as b', 'f.fl_bd_id', '=', 'b.bd_id')
            ->orderBy('b.bd_name')->orderBy('f.fl_name')
            ->selectRaw('f.fl_id as floor_id, f.fl_name as floor_name, f.fl_bd_id as building_id, b.bd_name as building_name')
            ->get()
            ->all();
    }

    /**
     * @throws \RuntimeException PARENT_NOT_FOUND|DUPLICATE_NAME
     */
    public function createFloor(string $name, int $buildingId): int
    {
        if (! DB::table('building')->where('bd_id', $buildingId)->exists()) {
            throw new \RuntimeException('PARENT_NOT_FOUND');
        }
        if (DB::table('floor')->whereRaw('LOWER(fl_name) = LOWER(?)', [$name])->where('fl_bd_id', $buildingId)->exists()) {
            throw new \RuntimeException('DUPLICATE_NAME');
        }

        return DB::table('floor')->insertGetId(['fl_name' => $name, 'fl_bd_id' => $buildingId], 'fl_id');
    }

    /**
     * @throws \RuntimeException NOT_FOUND|PARENT_NOT_FOUND|DUPLICATE_NAME
     */
    public function updateFloor(int $id, string $name, int $buildingId): bool
    {
        if (! DB::table('building')->where('bd_id', $buildingId)->exists()) {
            throw new \RuntimeException('PARENT_NOT_FOUND');
        }
        if (DB::table('floor')->whereRaw('LOWER(fl_name) = LOWER(?)', [$name])->where('fl_bd_id', $buildingId)->where('fl_id', '<>', $id)->exists()) {
            throw new \RuntimeException('DUPLICATE_NAME');
        }

        $affected = DB::table('floor')->where('fl_id', $id)->update(['fl_name' => $name, 'fl_bd_id' => $buildingId]);
        if ($affected === 0) {
            throw new \RuntimeException('NOT_FOUND');
        }

        return true;
    }

    /**
     * @throws \RuntimeException DEPENDENCY_EXISTS|NOT_FOUND
     */
    public function deleteFloor(int $id): bool
    {
        if (DB::table('room')->where('room_fl_id', $id)->exists()) {
            throw new \RuntimeException('DEPENDENCY_EXISTS');
        }

        $affected = DB::table('floor')->where('fl_id', $id)->delete();
        if ($affected === 0) {
            throw new \RuntimeException('NOT_FOUND');
        }

        return true;
    }

    public function getAllRooms(): array
    {
        return DB::table('room as r')
            ->leftJoin('floor as f', 'r.room_fl_id', '=', 'f.fl_id')
            ->leftJoin('building as b', 'f.fl_bd_id', '=', 'b.bd_id')
            ->orderBy('b.bd_name')->orderBy('f.fl_name')->orderBy('r.room_name')
            ->selectRaw('r.room_id as room_id, r.room_name as room_name, r.room_fl_id as floor_id,
                f.fl_name as floor_name, f.fl_bd_id as building_id, b.bd_name as building_name')
            ->get()
            ->all();
    }

    public function getRoomsByFloor(int $floorId): array
    {
        return DB::table('room')->where('room_fl_id', $floorId)->orderBy('room_id')
            ->selectRaw('room_id as room_id, room_name as room_name')->get()->all();
    }

    /**
     * @throws \RuntimeException PARENT_NOT_FOUND|DUPLICATE_NAME
     */
    public function createRoom(string $name, int $floorId): int
    {
        if (! DB::table('floor')->where('fl_id', $floorId)->exists()) {
            throw new \RuntimeException('PARENT_NOT_FOUND');
        }
        if (DB::table('room')->whereRaw('LOWER(room_name) = LOWER(?)', [$name])->where('room_fl_id', $floorId)->exists()) {
            throw new \RuntimeException('DUPLICATE_NAME');
        }

        return DB::table('room')->insertGetId(['room_name' => $name, 'room_fl_id' => $floorId], 'room_id');
    }

    /**
     * @throws \RuntimeException NOT_FOUND|PARENT_NOT_FOUND|DUPLICATE_NAME
     */
    public function updateRoom(int $id, string $name, int $floorId): bool
    {
        if (! DB::table('floor')->where('fl_id', $floorId)->exists()) {
            throw new \RuntimeException('PARENT_NOT_FOUND');
        }
        if (DB::table('room')->whereRaw('LOWER(room_name) = LOWER(?)', [$name])->where('room_fl_id', $floorId)->where('room_id', '<>', $id)->exists()) {
            throw new \RuntimeException('DUPLICATE_NAME');
        }

        $affected = DB::table('room')->where('room_id', $id)->update(['room_name' => $name, 'room_fl_id' => $floorId]);
        if ($affected === 0) {
            throw new \RuntimeException('NOT_FOUND');
        }

        return true;
    }

    /**
     * @throws \RuntimeException DEPENDENCY_EXISTS|NOT_FOUND
     */
    public function deleteRoom(int $id): bool
    {
        if (DB::table('repair_form')->where('rf_room_id', $id)->exists()) {
            throw new \RuntimeException('DEPENDENCY_EXISTS');
        }

        $affected = DB::table('room')->where('room_id', $id)->delete();
        if ($affected === 0) {
            throw new \RuntimeException('NOT_FOUND');
        }

        return true;
    }

    public function importLocations(array $locationList): bool
    {
        DB::transaction(function () use ($locationList) {
            foreach ($locationList as $loc) {
                $building = trim($loc['building_name'] ?? '');
                $floor = trim($loc['floor_name'] ?? '');
                $room = trim($loc['room_name'] ?? '');

                if (! $building || ! $floor || ! $room) {
                    continue;
                }

                $buildingRow = DB::table('building')->whereRaw('LOWER(bd_name) = LOWER(?)', [$building])->first();
                $buildingId = $buildingRow->bd_id ?? DB::table('building')->insertGetId(['bd_name' => $building], 'bd_id');

                $floorRow = DB::table('floor')->whereRaw('LOWER(fl_name) = LOWER(?)', [$floor])->where('fl_bd_id', $buildingId)->first();
                $floorId = $floorRow->fl_id ?? DB::table('floor')->insertGetId(['fl_name' => $floor, 'fl_bd_id' => $buildingId], 'fl_id');

                $roomExists = DB::table('room')->whereRaw('LOWER(room_name) = LOWER(?)', [$room])->where('room_fl_id', $floorId)->exists();
                if (! $roomExists) {
                    DB::table('room')->insert(['room_name' => $room, 'room_fl_id' => $floorId]);
                }
            }
        });

        return true;
    }

    /**
     * @return array{inUse: bool, count: int}
     *
     * @throws \RuntimeException INVALID_TYPE
     */
    public function checkUsageInRepairs(string $type, int $id): array
    {
        $count = match ($type) {
            'building' => DB::table('repair_form as rf')
                ->join('room as r', 'rf.rf_room_id', '=', 'r.room_id')
                ->join('floor as f', 'r.room_fl_id', '=', 'f.fl_id')
                ->where('f.fl_bd_id', $id)
                ->distinct('rf.rf_id')->count('rf.rf_id'),
            'floor' => DB::table('repair_form as rf')
                ->join('room as r', 'rf.rf_room_id', '=', 'r.room_id')
                ->where('r.room_fl_id', $id)
                ->distinct('rf.rf_id')->count('rf.rf_id'),
            'room' => DB::table('repair_form')->where('rf_room_id', $id)->count(),
            default => throw new \RuntimeException('INVALID_TYPE'),
        };

        return ['inUse' => $count > 0, 'count' => $count];
    }
}
