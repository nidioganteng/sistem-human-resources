<?php
declare(strict_types=1);

namespace App\Domain\Employee;

enum EmployeeStatus: string
{
    case Onboarding = 'onboarding';
    case Active     = 'active';
    case Inactive   = 'inactive';
}
