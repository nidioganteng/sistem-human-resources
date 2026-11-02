<?php
declare(strict_types=1);
namespace App\Application\Ports;
interface DocumentRenderer
{
    public function applicant(array $applicant, array $form, ?string $photo, ?string $signature): string;
    public function offering(array $offer, string $candidate, ?string $hrSignature, ?string $ceoSignature): string;
}
