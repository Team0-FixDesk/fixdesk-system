<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * ส่งการแจ้งเตือนไปยัง LINE Group ผ่าน LINE Messaging API
 * พอร์ตจาก fixdesk-backend/src/services/line-notification.service.js
 *
 * หมายเหตุ: เดิมฝั่ง Node ใช้ in-memory queue + retry เพราะเป็น process เดียวที่รันค้างไว้
 * แต่ Ruk-Com shared hosting ไม่มี background worker/cron ให้ใช้ (แต่ละ request คือ process ใหม่)
 * จึงส่งแบบ synchronous ภายใน request เดียวกัน พร้อม retry สั้นๆ เมื่อเจอ rate limit (429)
 */
class LineNotificationService
{
    private const MAX_RETRIES = 3;

    private const RETRY_DELAYS_MS = [500, 500, 500];

    private array $urgencyConfig = [
        'high' => ['bgColor' => '#FEE2E2', 'text' => '🔴 เร่งด่วนมาก', 'textColor' => '#991B1B'],
        'medium' => ['bgColor' => '#FEF3C7', 'text' => '🟡 ปานกลาง', 'textColor' => '#92400E'],
        'low' => ['bgColor' => '#D1FAE5', 'text' => '🟢 ไม่เร่งด่วน', 'textColor' => '#065F46'],
    ];

    public function isConfigured(): bool
    {
        return (bool) config('services.line.channel_access_token') && (bool) config('services.line.group_id');
    }

    public function notifyNewRepair(array $data): array
    {
        if (! $this->isConfigured()) {
            return ['success' => false, 'message' => 'LINE not configured or GROUP_ID missing'];
        }

        $body = $this->buildBody('🆕 มีงานแจ้งซ่อมใหม่', '#F97316', '#FFF7ED', array_filter([
            ['icon' => '👤', 'text' => $data['user_name'] ?? '-', 'bold' => true],
            isset($data['repair_type']) ? ['icon' => '⚙️', 'text' => $data['repair_type']] : null,
            ['icon' => '📝', 'text' => $data['repair_title'] ?? '-'],
            ['icon' => '📍', 'text' => $data['location'] ?? '-'],
            isset($data['phone']) ? ['icon' => '📞', 'text' => $data['phone']] : null,
        ]), $data, "🆕 มีงานแจ้งซ่อมใหม่: {$data['rf_code']}", footerLabel: 'มอบหมายช่างเลย', footerNote: '⚠️ กรุณามอบหมายช่างโดยเร็วที่สุด');

        return $this->send($body);
    }

    public function notifyJobAssignment(array $data): array
    {
        if (! $this->isConfigured()) {
            return ['success' => false, 'message' => 'LINE not configured or GROUP_ID missing'];
        }

        $isTeam = $data['is_team'] ?? false;
        $headerText = $isTeam ? '🔧 มอบหมายงานช่างแบบทีม' : '👤 มอบหมายงานช่างใหม่';
        $assignerDisplay = ($isTeam && ! empty($data['lead_name'])) ? $data['lead_name'] : ($data['assigned_by_name'] ?? '-');

        $body = $this->buildBody($headerText, '#0367D1', '#F0F0F0', array_filter([
            ['icon' => '🔧', 'text' => $data['technician_name'] ?? '-', 'bold' => true],
            isset($data['technician_type']) ? ['icon' => '⚙️', 'text' => $data['technician_type']] : null,
            ['icon' => '📝', 'text' => $data['repair_title'] ?? '-'],
            ['icon' => '📍', 'text' => $data['location'] ?? '-'],
        ]), $data, "{$headerText}: {$data['rf_code']}", extraFooterLines: [
            ($isTeam ? '👔 หัวหน้าทีม: ' : '👔 มอบหมายโดย: ').$assignerDisplay,
        ], footerLabel: 'ดูรายละเอียดบนเว็บไซต์');

        return $this->send($body);
    }

    public function notifyJobAccepted(array $data): array
    {
        if (! $this->isConfigured()) {
            return ['success' => false, 'message' => 'LINE not configured or GROUP_ID missing'];
        }

        $body = $this->buildBody('✅ ช่างรับงานแล้ว', '#10B981', '#F0F0F0', array_filter([
            ['icon' => '🔧', 'text' => $data['technician_name'] ?? '-', 'bold' => true],
            isset($data['technician_type']) ? ['icon' => '⚙️', 'text' => $data['technician_type']] : null,
            ['icon' => '📝', 'text' => $data['repair_title'] ?? '-'],
            ['icon' => '📍', 'text' => $data['location'] ?? '-'],
        ]), $data, "✅ ช่างรับงานแล้ว: {$data['rf_code']}", footerLabel: 'ดูรายละเอียดบนเว็บไซต์');

        return $this->send($body);
    }

    public function testNotification(): array
    {
        if (! $this->isConfigured()) {
            return ['success' => false, 'message' => 'LINE not configured or GROUP_ID missing'];
        }

        return $this->send([
            'type' => 'text',
            'text' => "🔔 ทดสอบการแจ้งเตือนจากระบบ FixDesk\n\nการแจ้งเตือนทำงานปกติ ✅",
        ]);
    }

    private function buildBody(string $headerText, string $headerColor, string $footerBoxColor, array $rows, array $data, string $altText, array $extraFooterLines = [], ?string $footerLabel = null, ?string $footerNote = null): array
    {
        $urgency = $this->urgencyConfig[$data['urgency'] ?? 'medium'] ?? $this->urgencyConfig['medium'];
        $now = now()->timezone('Asia/Bangkok')->format('d/m/Y H:i:s');

        $rowContents = array_map(fn ($row) => [
            'type' => 'box', 'layout' => 'baseline', 'spacing' => 'md',
            'contents' => [
                ['type' => 'text', 'text' => $row['icon'], 'size' => 'sm', 'flex' => 1],
                ['type' => 'text', 'text' => (string) $row['text'], 'size' => 'sm', 'color' => '#111111', 'flex' => 9, 'wrap' => true, 'weight' => ($row['bold'] ?? false) ? 'bold' : 'regular'],
            ],
        ], array_values($rows));

        $footerLines = array_map(fn ($line) => ['type' => 'text', 'text' => $line, 'size' => 'xs', 'color' => '#555555'], $extraFooterLines);
        $footerLines[] = ['type' => 'text', 'text' => "⏰ เวลา: {$now}", 'size' => 'xs', 'color' => '#555555', 'margin' => 'xs'];
        if ($footerNote) {
            $footerLines[] = ['type' => 'text', 'text' => $footerNote, 'size' => 'xs', 'color' => '#EA580C', 'weight' => 'bold', 'margin' => 'sm'];
        }

        return [
            'type' => 'flex',
            'altText' => $altText,
            'contents' => [
                'type' => 'bubble',
                'size' => 'giga',
                'header' => [
                    'type' => 'box', 'layout' => 'vertical', 'backgroundColor' => $headerColor,
                    'contents' => [['type' => 'text', 'text' => $headerText, 'weight' => 'bold', 'size' => 'xl', 'color' => '#ffffff']],
                ],
                'body' => [
                    'type' => 'box', 'layout' => 'vertical',
                    'contents' => [
                        ['type' => 'box', 'layout' => 'horizontal', 'contents' => [
                            ['type' => 'text', 'text' => 'รหัสงาน:', 'size' => 'sm', 'color' => '#8c8c8c', 'flex' => 2],
                            ['type' => 'text', 'text' => $data['rf_code'] ?? '-', 'size' => 'sm', 'color' => '#111111', 'align' => 'end', 'weight' => 'bold', 'flex' => 4],
                        ]],
                        ['type' => 'box', 'layout' => 'horizontal', 'margin' => 'md', 'contents' => [
                            ['type' => 'text', 'text' => 'ความเร่งด่วน:', 'size' => 'sm', 'color' => '#8c8c8c', 'flex' => 2],
                            ['type' => 'box', 'layout' => 'horizontal', 'justifyContent' => 'flex-end', 'backgroundColor' => $urgency['bgColor'], 'paddingAll' => '5px', 'cornerRadius' => 'md', 'flex' => 4, 'contents' => [
                                ['type' => 'text', 'text' => $urgency['text'], 'size' => 'xs', 'color' => $urgency['textColor'], 'weight' => 'bold', 'align' => 'center', 'gravity' => 'center'],
                            ]],
                        ]],
                        ['type' => 'separator', 'margin' => 'md'],
                        ['type' => 'box', 'layout' => 'vertical', 'margin' => 'lg', 'spacing' => 'sm', 'contents' => $rowContents],
                        ['type' => 'box', 'layout' => 'vertical', 'margin' => 'lg', 'backgroundColor' => $footerBoxColor, 'paddingAll' => '10px', 'cornerRadius' => 'md', 'contents' => $footerLines],
                    ],
                ],
                'footer' => $footerLabel ? [
                    'type' => 'box', 'layout' => 'vertical',
                    'contents' => [[
                        'type' => 'button', 'style' => 'primary', 'color' => $headerColor,
                        'action' => ['type' => 'uri', 'label' => $footerLabel, 'uri' => config('services.frontend_url').'/#/login'],
                    ]],
                ] : null,
            ],
        ];
    }

    private function send(array $message, int $retryCount = 0): array
    {
        $response = Http::withToken(config('services.line.channel_access_token'))
            ->post('https://api.line.me/v2/bot/message/push', [
                'to' => config('services.line.group_id'),
                'messages' => [$message],
            ]);

        if ($response->successful()) {
            return ['success' => true, 'message' => 'Notification sent'];
        }

        if ($response->status() === 429 && $retryCount < self::MAX_RETRIES) {
            $delayMs = self::RETRY_DELAYS_MS[$retryCount] ?? 500;
            $retryAfter = (int) $response->header('retry-after');
            if ($retryAfter > 0) {
                $delayMs = max($retryAfter * 1000, $delayMs);
            }
            usleep($delayMs * 1000);

            return $this->send($message, $retryCount + 1);
        }

        if ($response->status() === 429) {
            Log::error('LINE notification rate limit exceeded after retries', ['body' => $response->json()]);

            return [
                'success' => false,
                'errorType' => 'RATE_LIMIT_EXCEEDED',
                'message' => 'ถึงขีดจำกัดการแจ้งเตือน LINE กรุณาลองใหม่ในอีกสักครู่',
            ];
        }

        Log::error('LINE notification failed', ['status' => $response->status(), 'body' => $response->json()]);

        return ['success' => false, 'message' => 'LINE notification failed: '.$response->status()];
    }
}
