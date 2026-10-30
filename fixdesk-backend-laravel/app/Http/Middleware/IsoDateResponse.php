<?php

namespace App\Http\Middleware;

use Carbon\Carbon;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * แปลงค่า DATETIME/TIMESTAMP ใน JSON ของ API ให้เป็น ISO 8601 (UTC) เหมือนที่ Node (mysql2 → JSON.stringify) ส่งให้หน้าเว็บ
 *
 * ที่มา: Query Builder ของ Laravel คืนวันที่เป็นสตริงตรงจากฐานข้อมูล ("2026-10-28 10:01:16") ขณะที่ Node คืน Date ซึ่งกลายเป็น
 * "2026-10-28T03:01:16.000Z" หน้าเว็บอ่านด้วย new Date(...) ตรงๆ — รูปแบบที่ไม่มี "T"/โซนเวลาถูกตีความต่างกันตามเบราว์เซอร์
 * (Safari บางรุ่นอ่านไม่ได้) จึงส่งรูปแบบเดียวกับระบบเดิมเพื่อให้หน้าเว็บไม่ต้องแก้
 *
 * ค่าในฐานข้อมูลถือเป็นเวลาท้องถิ่นตาม APP_TIMEZONE (ต้องตรงกับ time zone ของ MySQL ที่เขียนด้วย NOW())
 */
class IsoDateResponse
{
    private const PATTERN = '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/';

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($response instanceof JsonResponse) {
            $response->setData($this->convert($response->getData(), config('app.timezone')));
        }

        return $response;
    }

    private function convert(mixed $value, string $timezone): mixed
    {
        if (is_string($value)) {
            if (! preg_match(self::PATTERN, $value)) {
                return $value;
            }

            try {
                return Carbon::createFromFormat('Y-m-d H:i:s', $value, $timezone)
                    ->utc()
                    ->format('Y-m-d\TH:i:s.v\Z');
            } catch (\Throwable) {
                return $value;
            }
        }

        if (is_array($value)) {
            foreach ($value as $key => $item) {
                $value[$key] = $this->convert($item, $timezone);
            }

            return $value;
        }

        if (is_object($value)) {
            foreach (get_object_vars($value) as $key => $item) {
                $value->{$key} = $this->convert($item, $timezone);
            }
        }

        return $value;
    }
}
