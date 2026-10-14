<?php
declare(strict_types=1);

namespace App\Domain\Shared;

/** Pengguna dikenal tetapi tidak berwenang (HTTP 403). */
class NotAllowed extends \DomainException {}
