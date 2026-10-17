<?php
declare(strict_types=1);

namespace App\Domain\Recruitment;

enum OfferingLetterStatus: string
{
    case Draft      = 'draft';
    case PendingCeo = 'pending_ceo';
    case Revision   = 'revision';
    case Approved   = 'approved';
    case Sent       = 'sent';
    case Accepted   = 'accepted';
    case Declined   = 'declined';
    case Expired    = 'expired';
}
