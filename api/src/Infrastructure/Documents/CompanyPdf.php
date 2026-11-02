<?php
declare(strict_types=1);
namespace App\Infrastructure\Documents;
use App\Application\Ports\DocumentRenderer;

final class CompanyPdf implements DocumentRenderer
{
    private function text(string $text): string
    {
        return iconv('UTF-8','windows-1252//TRANSLIT',str_replace(["\r\n","\r"],"\n",$text)) ?: '';
    }
    private function start(string $title): \FPDF
    {
        $p = new \FPDF(); $p->SetMargins(18,16,18); $p->SetAutoPageBreak(true,18); $p->AddPage();
        $p->SetTitle($this->text($title));
        $logo = dirname(__DIR__,4) . '/public/logo-gsg-light.png';
        if (!is_file($logo)) $logo = dirname(__DIR__,4) . '/logo-gsg-light.png';
        if (is_file($logo)) $p->Image($logo,18,15,13,13);
        $p->SetXY(36,15); $p->SetFont('Arial','B',15); $p->SetTextColor(23,36,72); $p->Cell(150,8,'GAHARU SEMPANA GROUP',0,1);
        $p->SetX(36); $p->SetFont('Arial','',9); $p->Cell(150,6,'Human Resource Management',0,1);
        $p->SetDrawColor(28,105,212); $p->Line(18,33,192,33); $p->SetY(39);
        $p->SetFont('Arial','B',13); $p->MultiCell(0,8,$this->text($title)); $p->Ln(4); $p->SetTextColor(30,41,59); $p->SetFont('Arial','',10);
        return $p;
    }
    private function row(\FPDF $p, string $label, mixed $value): void
    {
        $p->SetFont('Arial','B',9); $p->MultiCell(0,5,$this->text($label));
        $p->SetFont('Arial','',10); $p->MultiCell(0,5.5,$this->text((string)($value ?? '-'))); $p->Ln(2);
    }
    private function fields(\FPDF $p, array $data, int $depth = 0): void
    {
        foreach ($data as $key=>$value) {
            $label = is_numeric($key) ? 'Entri ' . ((int)$key+1) : ucwords(str_replace('_',' ',(string)$key));
            if (is_array($value)) {
                $p->SetFont('Arial','B',11); $p->MultiCell(0,7,$this->text($label));
                if ($value === []) $this->row($p,'Keterangan','Tidak diisi');
                else $this->fields($p,$value,$depth+1);
            } else $this->row($p,$label,$value);
        }
    }
    private function image(\FPDF $p, ?string $path, string $label, int $width = 42): void
    {
        if (!$path || !is_file($path)) return;
        $data = (string) file_get_contents($path); $info = getimagesizefromstring($data);
        if (!$info) return;
        $image = imagecreatefromstring($data); if (!$image) return;
        // White backing makes uploaded transparent signatures readable in the PDF.
        $jpg = imagecreatetruecolor($info[0],$info[1]); $white=imagecolorallocate($jpg,255,255,255);
        imagefill($jpg,0,0,$white); imagecopy($jpg,$image,0,0,0,0,$info[0],$info[1]);
        $temp = tempnam(sys_get_temp_dir(),'hr_pdf_image_');
        if ($temp === false) throw new \RuntimeException('File sementara PDF gagal.');
        try {
            imagejpeg($jpg,$temp,90); $height=min(45,$width*$info[1]/$info[0]);
            if ($p->GetY()+$height+12>275) $p->AddPage();
            $this->row($p,$label,''); $y=$p->GetY(); $p->Image($temp,18,$y,$width,$height,'JPG'); $p->SetY($y+$height+7);
        } finally { unset($image,$jpg); @unlink($temp); }
    }
    public function applicant(array $applicant, array $form, ?string $photo, ?string $signature): string
    {
        $p=$this->start('FORM PELAMAR DIGITAL');
        foreach (['fullName'=>'Nama Lengkap','email'=>'Email','phone'=>'Nomor HP','position'=>'Posisi'] as $k=>$label) $this->row($p,$label,$applicant[$k]??'-');
        $data=$form['data']??[]; if (is_string($data)) $data=json_decode($data,true,512,JSON_THROW_ON_ERROR);
        $this->fields($p,$data); $this->row($p,'Ekspektasi Gaji','Rp ' . number_format((float)($form['expected_salary']??0),0,',','.'));
        $this->row($p,'Dikirim Pada',$form['submitted_at']??'-');
        $this->image($p,$photo,'Pasfoto',30); $this->image($p,$signature,'Tanda Tangan Pelamar');
        return $p->Output('S');
    }
    public function offering(array $offer, string $candidate, ?string $hrSignature, ?string $ceoSignature): string
    {
        $p=$this->start('OFFERING LETTER');
        $this->row($p,'Kepada',$candidate); $this->row($p,'Posisi',$offer['position']);
        $this->row($p,'Gaji','Rp ' . number_format((float)$offer['salary'],0,',','.'));
        $this->row($p,'Tanggal Mulai',$offer['startDate']??'-'); $this->row($p,'Isi Penawaran',$offer['body']);
        $this->image($p,$hrSignature,'Tanda Tangan HR'); $this->image($p,$ceoSignature,'Persetujuan dan Tanda Tangan CEO');
        return $p->Output('S');
    }
}
