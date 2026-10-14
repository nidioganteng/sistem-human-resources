<?php
declare(strict_types=1);

namespace App\Domain\Recruitment;

enum EmploymentStatus: string
{
    case Pkwt  = 'PKWT';  // karyawan tidak tetap / kontrak
    case Pkwtt = 'PKWTT'; // karyawan tetap
}
