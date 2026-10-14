<?php
declare(strict_types=1);

namespace App\Domain\Shared;

/** Belum login atau kredensial salah (HTTP 401). */
class Unauthenticated extends \DomainException {}
