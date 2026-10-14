<?php
declare(strict_types=1);

namespace App\Domain\Shared;

/** Aturan bisnis dilanggar (HTTP 422). */
class DomainRuleViolation extends \DomainException {}
