<?php
declare(strict_types=1);

// Fictional local UI examples. These identifiers are not issued identity documents.
$people = [
    ['ayu', 'Ayu Pramesti', 'Arsitek Senior', 'Arsitektur', 'PKWTT', 'active', 9500000, '2023-04-03', null],
    ['bagas', 'Bagas Mahendra', 'Site Engineer', 'Sipil', 'PKWT', 'active', 7500000, '2026-02-02', '2027-02-01'],
    ['citra', 'Citra Lestari', 'Staf Human Resources', 'Human Resources', 'PKWTT', 'active', 6500000, '2024-08-05', null],
    ['dimas', 'Dimas Pratama', 'Quantity Surveyor', 'Sipil', 'PKWT', 'onboarding', 6000000, '2026-11-09', '2027-11-08'],
    ['elisa', 'Elisa Kartika', 'Desainer Interior', 'Interior', 'FREELANCE', 'active', 8500000, '2026-09-01', '2027-03-01'],
    ['farhan', 'Farhan Aditya', 'Staf Keuangan', 'Keuangan', 'PKWTT', 'active', 7000000, '2024-01-08', null],
    ['gina', 'Gina Permata', 'Drafter', 'Arsitektur', 'PKWT', 'inactive', 5500000, '2025-03-03', '2026-03-02'],
    ['hendra', 'Hendra Saputra', 'Konsultan Struktur', 'Sipil', 'FREELANCE', 'active', 12000000, '2026-06-01', '2027-05-31'],
    ['intan', 'Intan Maharani', 'Desainer Lanskap', 'Lanskap', 'FREELANCE', 'onboarding', 8000000, '2026-11-09', '2027-05-08'],
];
return array_map(static function (array $person, int $index): array {
    [$slug, $name, $position, $division, $type, $status, $salary, $start, $end] = $person;
    $number = $index + 1;
    return compact('position', 'division', 'type', 'status', 'salary', 'start', 'end') + [
        'name' => $name . ' (Demo)',
        'email' => 'demo.' . $slug . '@example.test',
        'nik' => '000000' . str_pad((string) $number, 10, '0', STR_PAD_LEFT),
        'phone' => '0000' . str_pad((string) $number, 8, '0', STR_PAD_LEFT),
        'personalData' => [
            'birth_date' => '1995-04-' . str_pad((string) ($number + 10), 2, '0', STR_PAD_LEFT),
            'birth_place' => 'Denpasar (data contoh)',
            'address' => 'Jalan Contoh Fiktif No. ' . $number . ', Denpasar — data demo',
            'religion' => 'Belum diisi',
            'marital_status' => $number % 2 === 0 ? 'Menikah' : 'Belum Menikah',
            'npwp_number' => '00000000000000' . str_pad((string) $number, 2, '0', STR_PAD_LEFT),
            'bpjs_number' => '000000000' . str_pad((string) $number, 4, '0', STR_PAD_LEFT),
            'emergency_contact' => 'Kontak keluarga demo — 000000000000',
            'ptkp_status' => $number % 2 === 0 ? 'K/0' : 'TK/0',
            'bank_name' => 'Bank Contoh (Fiktif)',
            'bank_account' => '000000000' . str_pad((string) $number, 3, '0', STR_PAD_LEFT),
            'bank_account_name' => $name . ' (Demo)',
            'payment_hold_note' => 'DATA DEMO — bukan data payroll nyata.',
            'demo_seed' => 'employee-directory-v1',
        ],
    ];
}, $people, array_keys($people));
