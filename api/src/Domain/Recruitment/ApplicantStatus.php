<?php
declare(strict_types=1);

namespace App\Domain\Recruitment;

enum ApplicantStatus: string
{
    case New            = 'new';
    case ScreenRejected = 'screen_rejected';
    case FormPending    = 'form_pending';
    case FormSubmitted  = 'form_submitted';
    case Shortlisted    = 'shortlisted';
    case NotSelected    = 'not_selected';
    case Selection      = 'selection';
    case OfferPending   = 'offer_pending';
    case Offered        = 'offered';
    case Accepted       = 'accepted';
    case Declined       = 'declined';
    case Expired        = 'expired';
    case Hired          = 'hired';
}
