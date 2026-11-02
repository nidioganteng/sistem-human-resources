<?php
declare(strict_types=1);
namespace App\Presentation\Http\Controllers;
use App\Domain\Employee\EmployeeRepository;
use App\Application\Ports\WorkforceStore;
use App\Presentation\Http\{Request, Response, HttpException};

/** Read-only integration. Separate token; never accepts an interactive user JWT. */
final class PayrollController
{
    public function __construct(private EmployeeRepository $employees, private WorkforceStore $store) {}
    public function index(Request $r, array $p): Response
    {
        $expected=defined('PAYROLL_API_TOKEN')?(string)PAYROLL_API_TOKEN:'';
        if(strlen($expected)<32)throw new HttpException(503,'Integrasi payroll belum dikonfigurasi.');
        if(!$r->bearerToken()||!hash_equals($expected,$r->bearerToken()))throw new HttpException(401,'Token integrasi tidak valid.');
        $page=max(1,(int)($r->query['page']??1));$limit=max(1,min(100,(int)($r->query['limit']??50)));
        $since=null;
        if(!empty($r->query['since'])){
            try{$since=new \DateTimeImmutable((string)$r->query['since']);}catch(\Throwable){throw new HttpException(422,'Parameter since tidak valid.');}
        }
        $all=array_values(array_filter($this->employees->findAll(),static fn($e)=>$e->validatedAt()!==null&&(!$since||$e->updatedAt()>=$since)));
        $items=[];
        foreach(array_slice($all,($page-1)*$limit,$limit) as $e){
            $d=$e->personalData()??[];$row=$this->store->find('employees',(int)$e->id());
            $items[]=['id'=>$e->id(),'name'=>$e->fullName(),'nik'=>$e->nik(),'npwp'=>$d['npwp_number']??null,
                'ptkpStatus'=>$d['ptkp_status']??null,'bankName'=>$d['bank_name']??null,'bankAccount'=>$d['bank_account']??null,
                'bankAccountName'=>$d['bank_account_name']??null,'bpjs'=>$d['bpjs_number']??null,
                'position'=>$e->position(),'employmentStatus'=>$e->employmentStatus(),'salary'=>$e->salary(),
                'paymentHoldNote'=>$d['payment_hold_note']??null,'status'=>$e->status()->value,
                'barcodeActive'=>(bool)($row['barcode_active']??false),'updatedAt'=>$e->updatedAt()->format(DATE_ATOM)];
        }
        header('Cache-Control: private, no-store');
        return Response::json(['items'=>$items,'page'=>$page,'limit'=>$limit,'total'=>count($all),'hasMore'=>$page*$limit<count($all)]);
    }
}
