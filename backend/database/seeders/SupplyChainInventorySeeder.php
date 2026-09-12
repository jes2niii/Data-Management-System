<?php

namespace Database\Seeders;

use App\Models\SupplyInventory;
use App\Models\UniformInventory;
use App\Models\CertificateInventory;
use App\Models\IndividualInventory;
use App\Models\PropertySummary;
use Illuminate\Database\Seeder;

class SupplyChainInventorySeeder extends Seeder
{
    public function run(): void
    {
        $userId = \App\Models\User::where('email','admin@admin.com')->first()?->id ?? 1;

        // Clear existing for re-seed
        SupplyInventory::truncate();
        UniformInventory::truncate();
        CertificateInventory::truncate();
        IndividualInventory::truncate();
        PropertySummary::truncate();

        // 1. Supply Inventory - from first screenshot (BEG. BAL., UNIT, DATE OUT, QTY, DATE IN, QTY2, TOTAL BAL.)
        $supplyData = [
            ['date'=>'2026-08-01','description'=>'CANDLE','beg'=>27,'unit'=>'PCS','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'9V BATTERY','beg'=>6,'unit'=>'PCS','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'A5 BOND PAPER','beg'=>4,'unit'=>'REAMS','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'A5 PLASTIC ENVELOPE','beg'=>0,'unit'=>'PCS','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'AIR FRESHENER (CR)','beg'=>5,'unit'=>'PCS','price'=>0,'date_out'=>'2026-08-03','q_out'=>2,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'AIR FRESHENER SPRAY','beg'=>0,'unit'=>'BTLS','price'=>0,'date_out'=>'2026-08-12','q_out'=>1,'date_in'=>'2026-08-04','q_in'=>4,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'ALCOHOL','beg'=>0,'unit'=>'','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'ARCH FILE CLEAR SHEET','beg'=>8,'unit'=>'PACKS','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BAND AID','beg'=>1,'unit'=>'BOX','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BATTERY (AA)','beg'=>5,'unit'=>'PCS','price'=>0,'date_out'=>'2026-08-03','q_out'=>1,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BATTERY (AAA)','beg'=>6,'unit'=>'PCS','price'=>0,'date_out'=>'2026-08-06','q_out'=>2,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BINDER CLIPS (1 5/8")','beg'=>2,'unit'=>'BOXES','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BINDER CLIPS (19MM)','beg'=>4,'unit'=>'BOXES','price'=>0,'date_out'=>'2026-08-15','q_out'=>1,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BINDER CLIPS (2")','beg'=>0,'unit'=>'BOXES','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BLACK SCREW 1"','beg'=>0,'unit'=>'PCS','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BOND PAPER (A4)','beg'=>5,'unit'=>'REAMS','price'=>0,'date_out'=>'2026-08-03','q_out'=>2,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BOND PAPER (LEGAL)','beg'=>3,'unit'=>'REAMS','price'=>0,'date_out'=>'2026-08-08','q_out'=>1,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BOND PAPER (LETTER)','beg'=>3,'unit'=>'REAMS','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BROTHER INK (BT5000C)','beg'=>1,'unit'=>'BTL','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BROTHER INK (BT5000M)','beg'=>0,'unit'=>'BTL','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BROTHER INK (BT5000Y)','beg'=>2,'unit'=>'BTLS','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BROTHER INK (BTD100BLK)','beg'=>2,'unit'=>'BTLS','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BROTHER INK (BTD100C)','beg'=>1,'unit'=>'BTL','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BROTHER INK (BTD100M)','beg'=>2,'unit'=>'BTLS','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BROTHER INK (BTD60)','beg'=>0,'unit'=>'BTLS','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BROTHER INK (BT60)','beg'=>0,'unit'=>'','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'BROWN ENVELOPE (LETTER)','beg'=>5,'unit'=>'BNDLS','price'=>0,'date_out'=>'2026-08-10','q_out'=>2,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'CABLE TIES','beg'=>40,'unit'=>'PCS','price'=>0,'date_out'=>'2026-08-06','q_out'=>12,'date_in'=>'2026-08-10','q_in'=>100,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'CERT. FRAME (A4)','beg'=>3,'unit'=>'PCS','price'=>0,'date_out'=>null,'q_out'=>null,'date_in'=>null,'q_in'=>null,'remarks'=>''],
            ['date'=>'2026-08-01','description'=>'COIN ENVELOPE','beg'=>1,'unit'=>'PACK','price'=>0,'date_out'=>'2026-08-07','q_out'=>1,'date_in'=>null,'q_in'=>null,'remarks'=>'FOR PR'],
        ];
        foreach ($supplyData as $d) {
            SupplyInventory::create([
                'date'=>$d['date'],'description'=>$d['description'],'beg_balance'=>$d['beg'],'unit'=>$d['unit'],'unit_price'=>$d['price'],'date_out'=>$d['date_out'],'qty_out'=>$d['q_out'],'date_in'=>$d['date_in'],'qty_in'=>$d['q_in'],'remarks'=>$d['remarks'],'created_by'=>$userId
            ]);
        }

        // 2. Uniform Inventory
        $uniformData = [
            ['date'=>'2026-08-01','desc'=>'SEATECH UNIFORM (S)','beg'=>70,'q_out'=>10,'d_out'=>'2026-08-13','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-01','desc'=>'SEATECH UNIFORM (M)','beg'=>0,'q_out'=>10,'d_out'=>'2026-08-08','q_in'=>30,'d_in'=>'2026-08-07'],
            ['date'=>'2026-08-01','desc'=>'SEATECH UNIFORM (L)','beg'=>114,'q_out'=>10,'d_out'=>'2026-08-03','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-01','desc'=>'SEATECH UNIFORM (XL)','beg'=>0,'q_out'=>10,'d_out'=>'2026-08-08','q_in'=>30,'d_in'=>'2026-08-07'],
            ['date'=>'2026-08-01','desc'=>'SEATECH UNIFROM (XXL)','beg'=>0,'q_out'=>10,'d_out'=>'2026-08-08','q_in'=>30,'d_in'=>'2026-08-07'],
            ['date'=>'2026-08-01','desc'=>'LARGE','beg'=>104,'q_out'=>25,'d_out'=>'2026-08-04','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-01','desc'=>'LARGE','beg'=>79,'q_out'=>10,'d_out'=>'2026-08-05','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-01','desc'=>'LARGE','beg'=>69,'q_out'=>20,'d_out'=>'2026-08-06','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-01','desc'=>'LARGE','beg'=>49,'q_out'=>10,'d_out'=>'2026-08-06','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-01','desc'=>'XXL','beg'=>20,'q_out'=>5,'d_out'=>'2026-08-10','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-01','desc'=>'LARGE','beg'=>39,'q_out'=>10,'d_out'=>'2026-08-11','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-01','desc'=>'MEDIUM','beg'=>20,'q_out'=>10,'d_out'=>'2026-08-11','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-01','desc'=>'XL','beg'=>20,'q_out'=>10,'d_out'=>'2026-08-11','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-01','desc'=>'LARGE','beg'=>29,'q_out'=>10,'d_out'=>'2026-08-13','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-01','desc'=>'XL','beg'=>10,'q_out'=>10,'d_out'=>'2026-08-13','q_in'=>120,'d_in'=>'2026-08-18'],
            ['date'=>'2026-08-01','desc'=>'LARGE','beg'=>19,'q_out'=>15,'d_out'=>'2026-08-17','q_in'=>72,'d_in'=>'2026-08-18'],
            ['date'=>'2026-08-01','desc'=>'MEDIUM','beg'=>10,'q_out'=>10,'d_out'=>'2026-08-17','q_in'=>null,'d_in'=>null,'remarks'=>'FOR PR'],
            ['date'=>'2026-08-01','desc'=>'XXL','beg'=>15,'q_out'=>5,'d_out'=>'2026-08-17','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-01','desc'=>'XXL','beg'=>10,'q_out'=>5,'d_out'=>'2026-08-19','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-01','desc'=>'XL','beg'=>120,'q_out'=>10,'d_out'=>'2026-08-19','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-01','desc'=>'LARGE','beg'=>76,'q_out'=>10,'d_out'=>'2026-08-19','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-01','desc'=>'SMALL','beg'=>60,'q_out'=>5,'d_out'=>'2026-08-19','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-20','desc'=>'GLOVES','beg'=>20,'q_out'=>3,'d_out'=>'2026-08-20','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-20','desc'=>'LONGSLEEVE (S)','beg'=>20,'q_out'=>6,'d_out'=>'2026-08-20','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-20','desc'=>'LONGSLEEVE (M)','beg'=>40,'q_out'=>10,'d_out'=>'2026-08-20','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-20','desc'=>'LONGSLEEVE (L)','beg'=>10,'q_out'=>10,'d_out'=>'2026-08-20','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-20','desc'=>'LONGSLEEVE (XL)','beg'=>30,'q_out'=>5,'d_out'=>'2026-08-20','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-20','desc'=>'LONGSLEEVE (XXL)','beg'=>20,'q_out'=>null,'d_out'=>null,'q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-20','desc'=>'LONGSLEEVE (3XL)','beg'=>10,'q_out'=>null,'d_out'=>null,'q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-20','desc'=>'PANTS (S)','beg'=>20,'q_out'=>null,'d_out'=>null,'q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-20','desc'=>'PANTS (M)','beg'=>39,'q_out'=>2,'d_out'=>'2026-08-20','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-20','desc'=>'PANTS (L)','beg'=>52,'q_out'=>3,'d_out'=>'2026-08-20','q_in'=>null,'d_in'=>null],
            ['date'=>'2026-08-20','desc'=>'PANTS (XL)','beg'=>50,'q_out'=>8,'d_out'=>'2026-08-20','q_in'=>null,'d_in'=>null],
        ];
        foreach ($uniformData as $d) {
            UniformInventory::create([
                'date'=>$d['date'],'description'=>$d['desc'],'beg_balance'=>$d['beg'],'unit'=>'PCS','date_out'=>$d['d_out']??null,'qty_out'=>$d['q_out']??null,'date_in'=>$d['d_in']??null,'qty_in'=>$d['q_in']??null,'remarks'=>$d['remarks']??'','created_by'=>$userId
            ]);
        }

        // 3. Certificate Inventory
        $certData = [
            ['date'=>'2026-08-01','desc'=>'NEW SECURITY CERT. (615901-616000)','beg'=>100,'unit'=>'PCS','t1'=>'615901-616000','d_out'=>'2026-08-05','q_out'=>100,'t2'=>'691501-693000','d_in'=>'2026-08-03','q_in'=>1500],
            ['date'=>'2026-08-01','desc'=>'SECURITY CERT. MANILA (OLD) 366301-366500','beg'=>200,'unit'=>'PCS','t1'=>null,'d_out'=>null,'q_out'=>null,'t2'=>null,'d_in'=>null,'q_in'=>null],
            ['date'=>'2026-08-01','desc'=>'PRIME CERTIFICATE (024901-025000)','beg'=>100,'unit'=>'PCS','t1'=>null,'d_out'=>null,'q_out'=>null,'t2'=>null,'d_in'=>null,'q_in'=>null,'remarks'=>'FOR PR'],
            ['date'=>'2026-08-01','desc'=>'SECURITY CERT. NAGA (OLD) 24401-25000','beg'=>0,'unit'=>'PCS','t1'=>null,'d_out'=>null,'q_out'=>null,'t2'=>null,'d_in'=>null,'q_in'=>null],
            ['date'=>'2026-08-01','desc'=>'SECURITY CERT. (LEGASPI) 3001-3500','beg'=>500,'unit'=>'PCS','t1'=>'3001-3200','d_out'=>'2026-08-12','q_out'=>200,'t2'=>null,'d_in'=>null,'q_in'=>null],
            ['date'=>'2026-08-01','desc'=>'OFFICIAL RECEIPT (0251-5000)','beg'=>95,'unit'=>'STUBS','t1'=>null,'d_out'=>null,'q_out'=>null,'t2'=>null,'d_in'=>null,'q_in'=>null],
            ['date'=>'2026-08-01','desc'=>'AR OF ALBAY MARITIME (0601-5000)','beg'=>88,'unit'=>'BOOKLET','t1'=>'0601-0700','d_out'=>'2026-08-04','q_out'=>2,'t2'=>null,'d_in'=>null,'q_in'=>null],
            ['date'=>'2026-08-01','desc'=>'NEW SECURITY CERT. (691501-693000)','beg'=>1500,'unit'=>'PCS','t1'=>'691501-691600','d_out'=>'2026-08-07','q_out'=>100,'t2'=>null,'d_in'=>null,'q_in'=>null],
            ['date'=>'2026-08-01','desc'=>'AR OF ALBAY MARITIME (0601-5000)','beg'=>86,'unit'=>'BOOKLET','t1'=>'0701-0800','d_out'=>'2026-08-07','q_out'=>2,'t2'=>null,'d_in'=>null,'q_in'=>null],
            ['date'=>'2026-08-01','desc'=>'NEW SECURITY CERT. (691501-693000)','beg'=>1400,'unit'=>'PCS','t1'=>'691801-691800','d_out'=>'2026-08-10','q_out'=>200,'t2'=>null,'d_in'=>null,'q_in'=>null],
            ['date'=>'2026-08-01','desc'=>'AR OF ALBAY MARITIME (0601-5000)','beg'=>84,'unit'=>'BOOKLET','t1'=>'0801-0900','d_out'=>'2026-08-11','q_out'=>2,'t2'=>null,'d_in'=>null,'q_in'=>null],
            ['date'=>'2026-08-01','desc'=>'AR OF ALBAY MARITIME (0601-5000)','beg'=>82,'unit'=>'BOOKLET','t1'=>'0901-0950','d_out'=>'2026-08-12','q_out'=>1,'t2'=>null,'d_in'=>null,'q_in'=>null],
            ['date'=>'2026-08-01','desc'=>'AR OF ALBAY MARITIME (0601-5000)','beg'=>81,'unit'=>'BOOKLET','t1'=>'0951-1050','d_out'=>'2026-08-17','q_out'=>2,'t2'=>null,'d_in'=>null,'q_in'=>null],
            ['date'=>'2026-08-01','desc'=>'NEW SECURITY CERT. (691501-693000)','beg'=>1200,'unit'=>'PCS','t1'=>'691801-691900','d_out'=>'2026-08-18','q_out'=>100,'t2'=>null,'d_in'=>null,'q_in'=>null],
            ['date'=>'2026-08-01','desc'=>'AR OF ALBAY MARITIME (0601-5000)','beg'=>79,'unit'=>'BOOKLET','t1'=>'1051-1150','d_out'=>'2026-08-21','q_out'=>2,'t2'=>null,'d_in'=>null,'q_in'=>null],
            ['date'=>'2026-08-01','desc'=>'NEW SECURITY CERT. (691501-693000)','beg'=>1100,'unit'=>'PCS','t1'=>'691901-692000','d_out'=>'2026-08-21','q_out'=>100,'t2'=>null,'d_in'=>null,'q_in'=>null],
        ];
        foreach ($certData as $d) {
            CertificateInventory::create([
                'date'=>$d['date'],'description'=>$d['desc'],'beg_balance'=>$d['beg'],'unit'=>$d['unit'],'tracking_no'=>$d['t1']??null,'date_out'=>$d['d_out']??null,'qty_out'=>$d['q_out']??null,'tracking_no2'=>$d['t2']??null,'date_in'=>$d['d_in']??null,'qty_in'=>$d['q_in']??null,'remarks'=>$d['remarks']??'','created_by'=>$userId
            ]);
        }

        // 4. Individual Inventory
        $individualData = [
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'ADM-OTBL-001','name'=>'OFFICE TABLE','desc'=>'BEIGE','remarks'=>'GOOD'],
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'ADM-FRPS-001','name'=>'FILE RACK PORTRAIT SILVER','desc'=>'SILVER','remarks'=>'GOOD'],
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'ADM-STB-002','name'=>'STAPLER BLUE','desc'=>'BLUE','remarks'=>'GOOD'],
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'ADM-PHR-008','name'=>'PEN HOLDER','desc'=>'BLACK','remarks'=>'GOOD'],
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'ADM-SCBG-001','name'=>'SCISSOR BLUE-GREEN','desc'=>'BLUE & GREEN','remarks'=>'GOOD'],
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'ADM-OCB-006','name'=>'OFFICE CHAIR BLACK','desc'=>'BLACK','remarks'=>'GOOD'],
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'ADM-ALPT-001','name'=>'ACER LAPTOP','desc'=>'ACER, SILVER','remarks'=>'GOOD'],
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'ADM-ALC-001','name'=>'ACER LAPTOP CHARGER','desc'=>'ACER, BLACK','remarks'=>'GOOD'],
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'ADM-VC-001','name'=>'VACUUM CLEANER','desc'=>'BLACK','remarks'=>'GOOD'],
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'ADM-LANT-001','name'=>'LAN TESTER','desc'=>'BLUE','remarks'=>'GOOD'],
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'ADM-USB-007','name'=>'FLASHDRIVE (64 GB)','desc'=>'SANDISK, SILVER & BLACK','remarks'=>'GOOD'],
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'REG-TLPTR-001','name'=>'THERMAL PRINTER','desc'=>'OFFICOM, BLACK','remarks'=>'GOOD'],
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'ADM-WM-002','name'=>'WIRELESS MOUSE','desc'=>'RAPOO, BLACK','remarks'=>'DAMAGED'],
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'SL-IFTB-001','name'=>'INFINIX TABLET','desc'=>'INFINIX XPAD 20, GREY','serial'=>'14304405AY000253','remarks'=>'GOOD'],
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'SL-IFTBC-001','name'=>'INFINIX TABLET CHARGER','desc'=>'INFINIX, WHITE','remarks'=>'GOOD'],
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'ADM-CT-001','name'=>'CRIMPING TOOL','desc'=>'ORANGE','date_received'=>'2026-06-16','remarks'=>'GOOD'],
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'ADM-RB-003','name'=>'RECORD BOOK','desc'=>'ADVANCE, BLUE','date_received'=>'2026-06-24','remarks'=>'GOOD'],
            ['emp'=>'JESTONI U. VARGAS','dept'=>'IT DEPT.','loc'=>'ADMIN OFFICE','code'=>'ADM-ALD-002','name'=>'ALCOHOL DESPENCER','desc'=>'TRANSPARENT','date_received'=>'2026-07-14','remarks'=>'GOOD'],
        ];
        foreach ($individualData as $d) {
            IndividualInventory::create([
                'employee_name'=>$d['emp'],'department'=>$d['dept'],'location'=>$d['loc'],'property_code'=>$d['code'],'property_name'=>$d['name'],'description'=>$d['desc'],'serial_number'=>$d['serial']??null,'control_no'=>null,'date_received'=>$d['date_received']??null,'remarks'=>$d['remarks'],'created_by'=>$userId
            ]);
        }

        // 5. Property Summary - AUGUST 2026
        $propertyData = [
            ['code'=>'LR201-AIR-001','name'=>'AIRCON','desc'=>'KOLIN, WHITE','serial'=>'191324101-22800','date'=>'2026-07-30','status'=>'Good Condition/Working'],
            ['code'=>'LR201-AIRR-001','name'=>'AIRCON REMOTE','desc'=>'KOLIN, WHITE','serial'=>null,'date'=>'2026-07-30','status'=>'Good Condition/Working'],
            ['code'=>'LR201-BT-001','name'=>'BROWN TABLE','desc'=>'BROWN','serial'=>null,'date'=>'2026-07-30','status'=>'Good Condition/Working'],
            ['code'=>'LR201-STV-001','name'=>'SAMSUNG TV','desc'=>'SAMSUNG, BLACK','serial'=>'3903-000657','date'=>'2026-07-30','status'=>'Good Condition/Working'],
            ['code'=>'LR201-TVR-001','name'=>'TV REMOTE','desc'=>'SAMSUNG, BLACK','serial'=>null,'date'=>'2026-07-30','status'=>'Good Condition/Working'],
            ['code'=>'LR201-ARM-001','name'=>'ARM CHAIR','desc'=>'BROWN','serial'=>null,'date'=>'2026-07-30','status'=>'Good Condition/Working'],
            ['code'=>'LR201-ARM-002','name'=>'ARM CHAIR','desc'=>'BROWN','serial'=>null,'date'=>'2026-07-30','status'=>'Good Condition/Working'],
            ['code'=>'LR201-ARM-003','name'=>'ARM CHAIR','desc'=>'BROWN','serial'=>null,'date'=>'2026-07-30','status'=>'Good Condition/Working'],
            ['code'=>'LR201-ARM-004','name'=>'ARM CHAIR','desc'=>'BROWN','serial'=>null,'date'=>'2026-07-30','status'=>'Good Condition/Working'],
            ['code'=>'LR201-ARM-005','name'=>'ARM CHAIR','desc'=>'BROWN','serial'=>null,'date'=>'2026-07-30','status'=>'Good Condition/Working'],
            ['code'=>'LR201-ARM-006','name'=>'ARM CHAIR','desc'=>'BROWN','serial'=>null,'date'=>'2026-07-30','status'=>'Good Condition/Working'],
            ['code'=>'LR201-ARM-007','name'=>'ARM CHAIR','desc'=>'BROWN','serial'=>null,'date'=>'2026-07-30','status'=>'Good Condition/Working'],
            ['code'=>'LR201-ARM-008','name'=>'ARM CHAIR','desc'=>'BROWN','serial'=>null,'date'=>'2026-07-30','status'=>'Good Condition/Working'],
            ['code'=>'LR201-ARM-009','name'=>'ARM CHAIR','desc'=>'BROWN','serial'=>null,'date'=>'2026-07-30','status'=>'Good Condition/Working'],
        ];
        foreach ($propertyData as $d) {
            PropertySummary::create([
                'month_year'=>'AUGUST 2026','property_code'=>$d['code'],'property_name'=>$d['name'],'description'=>$d['desc'],'serial_number'=>$d['serial'],'date_checked'=>$d['date'],'status'=>$d['status'],'created_by'=>$userId
            ]);
        }

        $this->command->info("Seeded Supply: ".SupplyInventory::count()." Uniform: ".UniformInventory::count()." Certificate: ".CertificateInventory::count()." Individual: ".IndividualInventory::count()." PropertySummary: ".PropertySummary::count());
    }
}
