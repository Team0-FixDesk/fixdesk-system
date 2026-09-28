<?php

namespace App\Http\Controllers;

use App\Services\LocationService;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    public function __construct(private LocationService $locationService) {}

    public function getBuildings()
    {
        try {
            return response()->json($this->locationService->getAllBuildings());
        } catch (\Throwable $e) {
            return response()->json(['message' => 'โหลดข้อมูลอาคารไม่สำเร็จ'], 500);
        }
    }

    public function createBuilding(Request $request)
    {
        $name = trim((string) $request->input('bd_name'));
        if (! $name) {
            return response()->json(['message' => 'กรุณากรอกชื่ออาคาร'], 400);
        }

        try {
            $newId = $this->locationService->createBuilding($name);

            return response()->json(['message' => 'เพิ่มอาคารสำเร็จ', 'bd_id' => $newId, 'bd_name' => $name], 201);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'DUPLICATE_NAME') {
                return response()->json(['message' => 'ชื่ออาคารนี้มีอยู่แล้ว'], 400);
            }

            return response()->json(['message' => 'เกิดข้อผิดพลาดในการเพิ่มอาคาร'], 500);
        }
    }

    public function updateBuilding(Request $request, int $id)
    {
        $name = trim((string) $request->input('bd_name'));
        if (! $name) {
            return response()->json(['message' => 'กรุณากรอกชื่ออาคาร'], 400);
        }

        try {
            $this->locationService->updateBuilding($id, $name);

            return response()->json(['message' => 'แก้ไขอาคารสำเร็จ']);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'NOT_FOUND' => response()->json(['message' => 'ไม่พบอาคาร'], 404),
                'DUPLICATE_NAME' => response()->json(['message' => 'ชื่ออาคารนี้มีอยู่แล้ว'], 400),
                default => response()->json(['message' => 'เกิดข้อผิดพลาดในการแก้ไข'], 500),
            };
        }
    }

    public function deleteBuilding(int $id)
    {
        try {
            $this->locationService->deleteBuilding($id);

            return response()->json(['message' => 'ลบอาคารสำเร็จ']);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'DEPENDENCY_EXISTS' => response()->json(['message' => 'ลบไม่ได้ มีชั้นใช้งานอยู่'], 400),
                'NOT_FOUND' => response()->json(['message' => 'ไม่พบอาคาร'], 404),
                default => response()->json(['message' => 'เกิดข้อผิดพลาดในการลบ'], 500),
            };
        }
    }

    public function getFloors(Request $request, ?int $buildingId = null)
    {
        try {
            if ($buildingId) {
                return response()->json($this->locationService->getFloorsByBuilding($buildingId));
            }

            return response()->json($this->locationService->getAllFloors());
        } catch (\Throwable $e) {
            return response()->json(['message' => 'โหลดข้อมูลชั้นไม่สำเร็จ'], 500);
        }
    }

    public function createFloor(Request $request)
    {
        $name = trim((string) $request->input('fl_name'));
        $buildingId = $request->input('fl_bd_id');
        if (! $name || ! $buildingId) {
            return response()->json(['message' => 'ข้อมูลไม่ครบถ้วน'], 400);
        }

        try {
            $newId = $this->locationService->createFloor($name, (int) $buildingId);

            return response()->json(['message' => 'เพิ่มชั้นสำเร็จ', 'fl_id' => $newId], 201);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'PARENT_NOT_FOUND' => response()->json(['message' => 'ไม่พบอาคารที่ระบุ'], 400),
                'DUPLICATE_NAME' => response()->json(['message' => 'ชื่อชั้นซ้ำในอาคารนี้'], 400),
                default => response()->json(['message' => 'เกิดข้อผิดพลาด'], 500),
            };
        }
    }

    public function updateFloor(Request $request, int $id)
    {
        $name = trim((string) $request->input('fl_name'));
        $buildingId = $request->input('fl_bd_id');
        if (! $name || ! $buildingId) {
            return response()->json(['message' => 'ข้อมูลไม่ครบถ้วน'], 400);
        }

        try {
            $this->locationService->updateFloor($id, $name, (int) $buildingId);

            return response()->json(['message' => 'แก้ไขชั้นสำเร็จ']);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'NOT_FOUND' => response()->json(['message' => 'ไม่พบชั้น'], 404),
                'PARENT_NOT_FOUND' => response()->json(['message' => 'ไม่พบอาคาร'], 400),
                'DUPLICATE_NAME' => response()->json(['message' => 'ชื่อชั้นซ้ำ'], 400),
                default => response()->json(['message' => 'เกิดข้อผิดพลาด'], 500),
            };
        }
    }

    public function deleteFloor(int $id)
    {
        try {
            $this->locationService->deleteFloor($id);

            return response()->json(['message' => 'ลบชั้นสำเร็จ']);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'DEPENDENCY_EXISTS' => response()->json(['message' => 'ลบไม่ได้ มีห้องใช้งานอยู่'], 400),
                'NOT_FOUND' => response()->json(['message' => 'ไม่พบชั้น'], 404),
                default => response()->json(['message' => 'เกิดข้อผิดพลาด'], 500),
            };
        }
    }

    public function getRooms(Request $request, ?int $floorId = null)
    {
        try {
            if ($floorId) {
                return response()->json($this->locationService->getRoomsByFloor($floorId));
            }

            return response()->json($this->locationService->getAllRooms());
        } catch (\Throwable $e) {
            return response()->json(['message' => 'โหลดข้อมูลห้องไม่สำเร็จ'], 500);
        }
    }

    public function createRoom(Request $request)
    {
        $name = trim((string) $request->input('room_name'));
        $floorId = $request->input('room_fl_id');
        if (! $name || ! $floorId) {
            return response()->json(['message' => 'ข้อมูลไม่ครบ'], 400);
        }

        try {
            $newId = $this->locationService->createRoom($name, (int) $floorId);

            return response()->json(['message' => 'เพิ่มห้องสำเร็จ', 'room_id' => $newId], 201);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'PARENT_NOT_FOUND' => response()->json(['message' => 'ไม่พบชั้นที่ระบุ'], 400),
                'DUPLICATE_NAME' => response()->json(['message' => 'ชื่อห้องซ้ำ'], 400),
                default => response()->json(['message' => 'เกิดข้อผิดพลาด'], 500),
            };
        }
    }

    public function updateRoom(Request $request, int $id)
    {
        $name = trim((string) $request->input('room_name'));
        $floorId = $request->input('room_fl_id');
        if (! $name || ! $floorId) {
            return response()->json(['message' => 'ข้อมูลไม่ครบ'], 400);
        }

        try {
            $this->locationService->updateRoom($id, $name, (int) $floorId);

            return response()->json(['message' => 'แก้ไขห้องสำเร็จ']);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'NOT_FOUND' => response()->json(['message' => 'ไม่พบห้อง'], 404),
                'PARENT_NOT_FOUND' => response()->json(['message' => 'ไม่พบชั้น'], 400),
                'DUPLICATE_NAME' => response()->json(['message' => 'ชื่อห้องซ้ำ'], 400),
                default => response()->json(['message' => 'เกิดข้อผิดพลาด'], 500),
            };
        }
    }

    public function deleteRoom(int $id)
    {
        try {
            $this->locationService->deleteRoom($id);

            return response()->json(['message' => 'ลบห้องสำเร็จ']);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'DEPENDENCY_EXISTS' => response()->json(['message' => 'ลบไม่ได้ มีใบแจ้งซ่อมใช้อยู่'], 400),
                'NOT_FOUND' => response()->json(['message' => 'ไม่พบห้อง'], 404),
                default => response()->json(['message' => 'เกิดข้อผิดพลาด'], 500),
            };
        }
    }

    public function importLocations(Request $request)
    {
        $locations = $request->input('locations');
        if (! is_array($locations) || empty($locations)) {
            return response()->json(['message' => 'ไม่มีข้อมูลสำหรับ Import'], 400);
        }

        try {
            $this->locationService->importLocations($locations);

            return response()->json(['message' => 'Import Location สำเร็จ']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Import ล้มเหลว', 'error' => $e->getMessage()], 500);
        }
    }

    public function checkUsageInRepairs(string $type, int $id)
    {
        if (! in_array($type, ['building', 'floor', 'room'], true)) {
            return response()->json(['message' => 'ประเภทไม่ถูกต้อง'], 400);
        }

        try {
            return response()->json($this->locationService->checkUsageInRepairs($type, $id));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'เกิดข้อผิดพลาดในการตรวจสอบการใช้งาน', 'error' => $e->getMessage()], 500);
        }
    }
}
